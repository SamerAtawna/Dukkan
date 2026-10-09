import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the secret key. It bypasses RLS on purpose:
 * the browser never gets this client; every read and write goes through a route handler.
 */
let client: SupabaseClient | undefined;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new ConfigError("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** Missing environment, not a bug: surfaces as 503 so the UI can say "not configured". */
export class ConfigError extends Error {
  readonly status = 503;
}

/** Row types, mirroring supabase/schema.sql. */
export type ProductRow = {
  id: string;
  title: string;
  short_title: string;
  price: number;
  currency: string;
  stock: number;
  visible: boolean;
  details: string[];
  description: string;
  ai_added: string | null;
  transcript: string | null;
  transcript_lang: string | null;
  art: string;
  tint: string;
  photos: { url: string; label: string }[];
  sold: number;
  created_at: string;
  updated_at: string;
};

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

export type OrderItem = { product_id: string; title: string; qty: number; unit_price: number };

export type OrderRow = {
  id: string;
  /** Secret carried in the pay link; required to read or capture the cart. */
  token: string;
  status: OrderStatus;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  amount: number;
  currency: string;
  items: OrderItem[];
  agent: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  shipping: PayPalShipping | null;
  carrier: string | null;
  tracking: string | null;
  cart_built_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

export type PayPalShipping = {
  name?: { full_name?: string };
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    admin_area_2?: string;
    admin_area_1?: string;
    postal_code?: string;
    country_code?: string;
  };
};

export type SearchRow = {
  id: number;
  query: string;
  found: boolean;
  product_id: string | null;
  agent: string | null;
  created_at: string;
};

export type ShopRow = {
  id: 1;
  name: string;
  lang: "ar" | "he" | "en";
  open: boolean;
  paypal_email: string | null;
  onboarded: boolean;
  notify_paid: boolean;
  notify_nomatch: boolean;
  notify_weekly: boolean;
  updated_at: string;
};
