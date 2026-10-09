import "server-only";
import { ConfigError, type PayPalShipping } from "@/lib/server/db";

/**
 * Thin PayPal Orders v2 client (sandbox by default). Create, capture, get, track.
 * https://developer.paypal.com/api/orders/v2/
 */

const BASE = () =>
  process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

let token: { value: string; expiresAt: number } | undefined;

async function accessToken(): Promise<string> {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new ConfigError("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in .env.local");
  const res = await fetch(`${BASE()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new PayPalError("Could not get a PayPal access token", res.status, await res.text());
  const json = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return token.value;
}

/** True when the configured client id and secret can get a token. Used by onboarding. */
export async function verifyCredentials(): Promise<boolean> {
  await accessToken();
  return true;
}

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

async function call<T>(path: string, init: RequestInit & { requestId?: string } = {}): Promise<T> {
  const { requestId, headers, ...rest } = init;
  const res = await fetch(`${BASE()}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
      ...(headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new PayPalError(`PayPal ${init.method ?? "GET"} ${path} failed`, res.status, text);
  return (text ? JSON.parse(text) : {}) as T;
}

export type Money = { currency_code: string; value: string };

export type CreateOrderItem = {
  sku: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
};

export type PayPalOrder = {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  links?: { href: string; rel: string; method?: string }[];
  payer?: {
    payer_id?: string;
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
  purchase_units?: {
    reference_id?: string;
    custom_id?: string;
    shipping?: PayPalShipping;
    payments?: {
      captures?: { id: string; status: string; amount: Money; create_time?: string }[];
    };
  }[];
};

const money = (n: number, currency: string): Money => ({ currency_code: currency, value: n.toFixed(2) });

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
  const order = await call<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    requestId: `dukkan-${opts.customId}-${Date.now()}`,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: "default",
          custom_id: opts.customId,
          description: opts.items
            .map((i) => i.name)
            .join(", ")
            .slice(0, 127),
          amount: {
            ...money(itemTotal, currency),
            breakdown: { item_total: money(itemTotal, currency) },
          },
          items: opts.items.map((i) => ({
            sku: i.sku,
            name: i.name.slice(0, 127),
            description: i.description?.slice(0, 127),
            quantity: String(i.quantity),
            unit_amount: money(i.unitPrice, currency),
            category: "PHYSICAL_GOODS",
          })),
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: opts.brand,
            user_action: "PAY_NOW",
            shipping_preference: "GET_FROM_FILE",
            return_url: opts.returnUrl,
            cancel_url: opts.cancelUrl,
          },
        },
      },
    }),
  });
  const approveUrl = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  return { id: order.id, approveUrl };
}

export function captureOrder(paypalOrderId: string): Promise<PayPalOrder> {
  return call<PayPalOrder>(`/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    requestId: `dukkan-capture-${paypalOrderId}`,
  });
}

export function getOrder(paypalOrderId: string): Promise<PayPalOrder> {
  return call<PayPalOrder>(`/v2/checkout/orders/${paypalOrderId}`);
}

/** The completed capture on an order, or undefined if none yet. */
export function completedCapture(order: PayPalOrder) {
  return order.purchase_units?.[0]?.payments?.captures?.find((c) => c.status === "COMPLETED");
}

/** Add tracking so the buyer sees "shipped" in PayPal too (Orders v2 /track). */
export function addTracking(paypalOrderId: string, captureId: string, carrier: string, trackingNumber: string) {
  const upper = carrier.toUpperCase();
  const carrierCode = upper === "DHL" ? "DHL" : upper.includes("ISRAEL") ? "ISRAEL_POST" : "OTHER";
  return call(`/v2/checkout/orders/${paypalOrderId}/track`, {
    method: "POST",
    body: JSON.stringify({
      capture_id: captureId,
      tracking_number: trackingNumber,
      carrier: carrierCode,
      ...(carrierCode === "OTHER" ? { carrier_name_other: carrier } : {}),
      notify_payer: true,
    }),
  });
}
