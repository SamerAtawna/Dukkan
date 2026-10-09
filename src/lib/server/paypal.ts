import "server-only";
import {
  ApiError,
  CaptureStatus,
  CheckoutPaymentIntent,
  Client,
  Environment,
  ItemCategory,
  OrdersController,
  PaymentsController,
  PaypalExperienceUserAction,
  PaypalWalletContextShippingPreference,
  RefundStatus,
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
const payments = () => new PaymentsController(paypal());

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string
  ) {
    super(message);
  }
  /** PayPal error name, e.g. ORDER_NOT_APPROVED or ORDER_ALREADY_CAPTURED; identity errors use `error`. */
  get code(): string | undefined {
    try {
      const b = JSON.parse(this.body) as { name?: string; error?: string; error_description?: string };
      return b.name ?? (b.error && b.error_description ? `${b.error}, ${b.error_description}` : b.error);
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
/* ------------------------- Log in with PayPal (seller connect) ------------------------- */
// Identity is not part of the PayPal Server SDK, so these two calls use fetch directly.
// https://developer.paypal.com/docs/log-in-with-paypal/integrate/

/** One-time state for the sign-in round trip (HttpOnly cookie, scoped to /api/paypal). */
export const PAYPAL_STATE_COOKIE = "dk_pp_state";

const live = () => process.env.PAYPAL_ENV === "live";
const webBase = () => (live() ? "https://www.paypal.com" : "https://www.sandbox.paypal.com");
const apiBase = () => (live() ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

function appCredentials() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new ConfigError("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in .env.local");
  return { id, secret };
}

/** PayPal's own sign-in page. The return URL must be registered on the app (Log in with PayPal → Manage). */
export function sellerLoginUrl(redirectUri: string, state: string): string {
  const u = new URL(`${webBase()}/connect`);
  u.searchParams.set("flowEntry", "static");
  u.searchParams.set("client_id", appCredentials().id);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}

/** Swap the sign-in code for the account's email and id. Never sees a password. */
export async function sellerFromCode(code: string): Promise<{ email: string; accountId: string | null }> {
  const { id, secret } = appCredentials();
  const tokenRes = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code }),
    cache: "no-store",
  });
  const tokenText = await tokenRes.text();
  if (!tokenRes.ok) throw new PayPalError("PayPal did not accept the sign-in code", tokenRes.status, tokenText);
  const token = JSON.parse(tokenText) as { access_token: string };

  // PayPal documents two user-info paths; try the OpenID one when the oauth2 one refuses. Both refuse
  // the account that owns the app: it gets the app's own first-party token (merchant scopes, no
  // id_token), and user info has no profile to serve for it (400 "Unable to fetch details", then 401).
  // The seller has to be a different account from the app owner (verified in the sandbox, 10 Oct 2026).
  const urls = [
    `${apiBase()}/v1/identity/oauth2/userinfo?schema=paypalv1.1`,
    `${apiBase()}/v1/identity/openidconnect/userinfo?schema=openid`,
  ];
  let failure: PayPalError | null = null;
  for (const url of urls) {
    const infoRes = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
    const infoText = await infoRes.text();
    if (!infoRes.ok) {
      failure = new PayPalError("PayPal did not share the account details", infoRes.status, infoText);
      console.error("[paypal connect]", url, infoRes.status, infoText);
      continue;
    }
    const account = accountFrom(JSON.parse(infoText) as UserInfo);
    if (account) return account;
    failure = new PayPalError("PayPal did not share the account's email", 502, infoText);
    console.error("[paypal connect] no email in", url, infoText);
  }

  throw failure ?? new PayPalError("PayPal did not share the account details", 502, "");
}

type UserInfo = {
  user_id?: string;
  payer_id?: string;
  email?: string;
  emails?: { value: string; primary?: boolean }[];
};

function accountFrom(info: UserInfo): { email: string; accountId: string | null } | null {
  const email = info.emails?.find((e) => e.primary)?.value ?? info.emails?.[0]?.value ?? info.email;
  if (!email) return null;
  return { email, accountId: info.payer_id ?? info.user_id ?? null };
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
  /** The connected seller's PayPal account; without it the app's own account is paid. */
  payeeEmail?: string | null;
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
            ...(opts.payeeEmail ? { payee: { emailAddress: opts.payeeEmail } } : {}),
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

/**
 * Refund a captured payment in full (Payments v2 /captures/{id}/refund). The request id is the
 * capture's, so a repeated refund returns the same refund instead of refunding twice.
 * PENDING counts as done: PayPal has accepted the refund and settles it on its side.
 */
export async function refundCapture(captureId: string, noteToPayer: string): Promise<{ id: string; status: RefundStatus | undefined }> {
  const refund = await run("refund", () =>
    payments().refundCapturedPayment({
      captureId,
      paypalRequestId: `dukkan-refund-${captureId}`,
      prefer: "return=representation",
      body: { noteToPayer: noteToPayer.slice(0, 255) },
    })
  );
  if (!refund.id || refund.status === RefundStatus.Failed || refund.status === RefundStatus.Cancelled) {
    throw new PayPalError(`PayPal refund ${refund.status?.toLowerCase() ?? "failed"}`, 502, JSON.stringify(refund));
  }
  return { id: refund.id, status: refund.status };
}
