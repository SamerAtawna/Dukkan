import "server-only";
import {
  ApiError,
  CaptureStatus,
  CheckoutPaymentIntent,
  Client,
  Environment,
  ItemCategory,
  OrdersController,
  PaypalExperienceUserAction,
  PaypalWalletContextShippingPreference,
  ShipmentCarrier,
} from "@paypal/paypal-server-sdk";
import type { Money, OAuthToken, Order } from "@paypal/paypal-server-sdk";
import { ConfigError, type PayPalShipping } from "@/lib/server/db";

/**
 * PayPal Orders v2 through the official PayPal Server SDK (APIMatic-generated), sandbox by default.
 * Create, capture, get, track. Built with the APIMatic Context Plugin for PayPal; the SDK facts
 * below (defaults, token caching, error shapes) were checked against the SDK source, v2.5.0.
 */

let client: Client | undefined;
/** The last token fetch failure, so a request that could not authenticate reports why. */
let tokenFailure: unknown;

function paypal(): Client {
  if (client) return client;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new ConfigError("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in .env.local");
  client = new Client({
    environment: process.env.PAYPAL_ENV === "live" ? Environment.Production : Environment.Sandbox,
    // The generated default is 0, which axios reads as "never time out".
    timeout: 20_000,
    // Retries are off by default. GETs are safe to repeat; create and capture are not retried here
    // (they carry PayPal-Request-Id, so the buyer's own retry is the safe one).
    httpClientOptions: { retryConfig: { maxNumberOfRetries: 2, maximumRetryWaitTime: 8, httpMethodsToRetry: ["GET"] } },
    clientCredentialsAuthCredentials: {
      oAuthClientId: id,
      oAuthClientSecret: secret,
      oAuthClockSkew: 60,
      // The SDK caches the token promise for the client's lifetime, so one rejected token fetch
      // would fail every later call until the server restarts. Never reject: hand back no token,
      // which makes this call fail and the next one fetch again.
      oAuthTokenProvider: async (_last, manager) => {
        try {
          const token = await manager.fetchToken();
          tokenFailure = undefined;
          return token;
        } catch (err) {
          tokenFailure = err;
          return undefined as unknown as OAuthToken;
        }
      },
    },
  });
  return client;
}

const orders = () => new OrdersController(paypal());

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string
  ) {
    super(message);
  }
  /** PayPal error name, e.g. ORDER_NOT_APPROVED or ORDER_ALREADY_CAPTURED. */
  get code(): string | undefined {
    try {
      return (JSON.parse(this.body) as { name?: string }).name;
    } catch {
      return undefined;
    }
  }
}

/** Run one SDK call and turn its failures into PayPalError (http.ts maps that to a 502). */
async function run<T>(what: string, call: () => Promise<{ result: T }>): Promise<T> {
  try {
    return (await call()).result;
  } catch (err) {
    if (err instanceof ConfigError) throw err;
    const cause = err instanceof ApiError ? err : tokenFailure instanceof ApiError ? tokenFailure : undefined;
    if (cause) {
      const body = typeof cause.body === "string" ? cause.body : JSON.stringify(cause.result ?? null);
      throw new PayPalError(cause === err ? `PayPal ${what} failed` : "Could not get a PayPal access token", cause.statusCode, body);
    }
    const reason = tokenFailure ?? err;
    throw new PayPalError(`PayPal ${what} failed: ${reason instanceof Error ? reason.message : "network error"}`, 502, "");
  }
}

/** True when the configured client id and secret can get a token. Used by onboarding. */
export async function verifyCredentials(): Promise<boolean> {
  await run("token", async () => ({ result: await paypal().clientCredentialsAuthManager.fetchToken() }));
  return true;
}

export type PayPalOrder = Order;

export type CreateOrderItem = {
  sku: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
};

const money = (n: number, currency: string): Money => ({ currencyCode: currency, value: n.toFixed(2) });

/**
 * Create a CAPTURE-intent order for one cart. `customId` is our order id, so the
 * capture reconciles even if the buyer approves much later.
 */
export async function createOrder(opts: {
  customId: string;
  items: CreateOrderItem[];
  currency?: string;
  brand: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; approveUrl: string | undefined }> {
  const currency = opts.currency ?? "USD";
  const itemTotal = opts.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const order = await run("create order", () =>
    orders().createOrder({
      paypalRequestId: `dukkan-${opts.customId}-${Date.now()}`,
      prefer: "return=representation",
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            referenceId: "default",
            customId: opts.customId,
            description: opts.items
              .map((i) => i.name)
              .join(", ")
              .slice(0, 127),
            amount: { ...money(itemTotal, currency), breakdown: { itemTotal: money(itemTotal, currency) } },
            items: opts.items.map((i) => ({
              sku: i.sku,
              name: i.name.slice(0, 127),
              description: i.description?.slice(0, 127),
              quantity: String(i.quantity),
              unitAmount: money(i.unitPrice, currency),
              category: ItemCategory.PhysicalGoods,
            })),
          },
        ],
        paymentSource: {
          paypal: {
            experienceContext: {
              brandName: opts.brand,
              userAction: PaypalExperienceUserAction.PayNow,
              shippingPreference: PaypalWalletContextShippingPreference.GetFromFile,
              returnUrl: opts.returnUrl,
              cancelUrl: opts.cancelUrl,
            },
          },
        },
      },
    })
  );
  if (!order.id) throw new PayPalError("PayPal returned an order without an id", 502, "");
  const approveUrl = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  return { id: order.id, approveUrl };
}

export function captureOrder(paypalOrderId: string): Promise<PayPalOrder> {
  return run("capture order", () =>
    orders().captureOrder({
      id: paypalOrderId,
      paypalRequestId: `dukkan-capture-${paypalOrderId}`,
      prefer: "return=representation",
    })
  );
}

export function getOrder(paypalOrderId: string): Promise<PayPalOrder> {
  return run("get order", () => orders().getOrder({ id: paypalOrderId }));
}

/** The completed capture on an order, or undefined if none yet. */
export function completedCapture(order: PayPalOrder) {
  const capture = order.purchaseUnits?.[0]?.payments?.captures?.find((c) => c.status === CaptureStatus.Completed);
  return capture?.id ? { id: capture.id, createTime: capture.createTime } : undefined;
}

/** Who paid and where it ships, with shipping in PayPal's wire shape (what the orders table stores). */
export function buyerOf(order: PayPalOrder): { name: string | null; email: string | null; shipping: PayPalShipping | null } {
  const ship = order.purchaseUnits?.[0]?.shipping;
  const payerName = [order.payer?.name?.givenName, order.payer?.name?.surname].filter(Boolean).join(" ");
  const a = ship?.address;
  return {
    name: ship?.name?.fullName || payerName || null,
    email: order.payer?.emailAddress ?? null,
    shipping: ship
      ? {
          name: ship.name?.fullName ? { full_name: ship.name.fullName } : undefined,
          address: a
            ? {
                address_line_1: a.addressLine1,
                address_line_2: a.addressLine2,
                admin_area_2: a.adminArea2,
                admin_area_1: a.adminArea1,
                postal_code: a.postalCode,
                country_code: a.countryCode,
              }
            : undefined,
        }
      : null,
  };
}

/** Add tracking so the buyer sees "shipped" in PayPal too (Orders v2 /track). */
export function addTracking(paypalOrderId: string, captureId: string, carrier: string, trackingNumber: string) {
  const upper = carrier.toUpperCase();
  const code = upper === "DHL" ? ShipmentCarrier.Dhl : upper.includes("ISRAEL") ? ShipmentCarrier.IsraelPost : ShipmentCarrier.Other;
  return run("add tracking", () =>
    orders().createOrderTracking({
      id: paypalOrderId,
      body: {
        captureId,
        trackingNumber,
        carrier: code,
        ...(code === ShipmentCarrier.Other ? { carrierNameOther: carrier } : {}),
        notifyPayer: true,
      },
    })
  );
}
