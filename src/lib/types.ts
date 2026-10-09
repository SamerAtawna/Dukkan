/**
 * Shapes shared between route handlers and the client stores.
 * Server rows (src/lib/server/db.ts) are mapped to these in src/lib/server/store.ts.
 */

export type SellerLang = "ar" | "he" | "en";

export type ProductArt = "cushion" | "spoons" | "rug" | "generic";

export type Photo = { url: string; label: string };

export type Product = {
  id: string;
  title: string;
  shortTitle: string;
  price: number;
  currency: string;
  stock: number;
  visible: boolean;
  details: string[];
  description: string;
  /** The "Added by AI" line the seller kept, if any. */
  aiAdded: string | null;
  transcript: string | null;
  transcriptLang: string | null;
  art: ProductArt;
  tint: string;
  photos: Photo[];
  /** Agent searches that matched this product in the last 7 days. */
  foundThisWeek: number;
  sold: number;
  createdAt: string;
};

export type NewProduct = {
  title: string;
  shortTitle?: string;
  price: number;
  stock: number;
  details: string[];
  description: string;
  aiAdded?: string | null;
  transcript?: string | null;
  transcriptLang?: string | null;
  art?: ProductArt;
  tint?: string;
  photos?: Photo[];
  visible?: boolean;
};

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";

export type OrderItem = { productId: string; title: string; qty: number; unitPrice: number };

export type Address = {
  name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  region: string | null;
  postal: string | null;
  country: string | null;
};

export type Order = {
  id: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  items: OrderItem[];
  agent: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  address: Address | null;
  carrier: string | null;
  tracking: string | null;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  paypalRefundId: string | null;
  /** Secret in the pay link (/pay/[id]?t=). */
  payToken: string;
  cartBuiltAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  refundedAt: string | null;
  /** Seller-facing one-liner, in the seller's language. */
  summary: string;
  /** Seller-facing paragraph, in the seller's language. */
  story: string;
  lang: SellerLang;
};

export type SearchStatus = "ok" | "miss" | "paused";

export type AgentSearch = {
  id: string;
  query: string;
  count: number;
  status: SearchStatus;
  /** 0..1 relative to the top query. */
  share: number;
  productId: string | null;
};

export type SearchesReport = {
  period: string;
  total: number;
  found: number;
  searches: AgentSearch[];
  /** The most-wanted thing the shop does not sell, if any. */
  insight: { query: string; count: number } | null;
};

export type Shop = {
  name: string;
  lang: SellerLang;
  open: boolean;
  paypalEmail: string | null;
  onboarded: boolean;
  notifyPaid: boolean;
  notifyNoMatch: boolean;
  notifyWeekly: boolean;
};

export type EventKind = "paid" | "nomatch" | "cart" | "live";

export type ShopEvent = {
  id: string;
  kind: EventKind;
  at: string;
  summary: string;
  summaryLang: SellerLang;
  amount?: string;
  meta: string;
  metaWarn?: boolean;
  action: { label: string; href: string };
};

export type HomeFeed = {
  today: { orders: number; paid: number; searches: number };
  events: ShopEvent[];
  /** Latest paid order id, so the client can notice a new one. */
  latestPaidId: string | null;
};

/** What the agent-facing catalogue returns per product (no seller-only fields). */
export type CatalogItem = {
  id: string;
  title: string;
  price: number;
  currency: string;
  inStock: number;
  details: string[];
  description: string;
  photos: Photo[];
};

export type CheckoutResult = {
  orderId: string;
  paypalOrderId: string;
  total: number;
  currency: string;
  /** Buyer-facing page with the PayPal button for this cart. */
  payUrl: string;
  /** Direct PayPal approval link (same order), for agents that want to hand it over raw. */
  approveUrl: string | null;
  items: OrderItem[];
};

export const formatPrice = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

/** "$35.00" → 35; null if nothing numeric was typed. */
export function parsePrice(s: string): number | null {
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && s.trim() !== "" ? n : null;
}
