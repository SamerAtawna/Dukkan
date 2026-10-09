import "server-only";
import { db, type OrderRow, type ProductRow, type SearchRow, type ShopRow } from "@/lib/server/db";
import { badRequest, notFound } from "@/lib/server/http";
import { orderStory, orderSummary } from "@/lib/server/text";
import type {
  Address,
  AgentSearch,
  CatalogItem,
  NewProduct,
  Order,
  OrderItem,
  Product,
  ProductArt,
  SearchesReport,
  SellerLang,
  Shop,
} from "@/lib/types";

/** Data access. Every function maps DB rows to the client shapes in src/lib/types.ts. */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const weekAgo = () => new Date(Date.now() - WEEK_MS).toISOString();

function fail(where: string, error: { message: string } | null): never {
  throw new Error(`${where}: ${error?.message ?? "unknown error"}`);
}

/* ---------------------------------- shop ---------------------------------- */

export async function getShop(): Promise<Shop> {
  const { data, error } = await db().from("shop").select("*").eq("id", 1).maybeSingle<ShopRow>();
  if (error) fail("getShop", error);
  if (!data) throw new Error("getShop: the shop row is missing. Run supabase/schema.sql.");
  return mapShop(data);
}

/** The seller signed in on PayPal's page: their account is now the one every order pays. */
export async function connectPayPal(account: { email: string; accountId: string | null }): Promise<Shop> {
  const { data, error } = await db()
    .from("shop")
    .update({
      paypal_email: account.email,
      paypal_account_id: account.accountId,
      paypal_connected_at: new Date().toISOString(),
      onboarded: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("*")
    .single<ShopRow>();
  if (error) fail("connectPayPal", error);
  return mapShop(data);
}

export async function updateShop(patch: Partial<Shop>): Promise<Shop> {
  const row: Partial<ShopRow> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.lang !== undefined) row.lang = patch.lang;
  if (patch.open !== undefined) row.open = patch.open;
  if (patch.paypalEmail !== undefined) {
    row.paypal_email = patch.paypalEmail;
    if (patch.paypalEmail === null) {
      row.paypal_account_id = null;
      row.paypal_connected_at = null;
    }
  }
  if (patch.onboarded !== undefined) row.onboarded = patch.onboarded;
  if (patch.notifyPaid !== undefined) row.notify_paid = patch.notifyPaid;
  if (patch.notifyNoMatch !== undefined) row.notify_nomatch = patch.notifyNoMatch;
  if (patch.notifyWeekly !== undefined) row.notify_weekly = patch.notifyWeekly;
  row.updated_at = new Date().toISOString();
  const { data, error } = await db().from("shop").update(row).eq("id", 1).select("*").single<ShopRow>();
  if (error) fail("updateShop", error);
  return mapShop(data);
}

function mapShop(r: ShopRow): Shop {
  return {
    name: r.name,
    lang: r.lang,
    open: r.open,
    paypalEmail: r.paypal_email,
    onboarded: r.onboarded,
    notifyPaid: r.notify_paid,
    notifyNoMatch: r.notify_nomatch,
    notifyWeekly: r.notify_weekly,
  };
}

/* -------------------------------- products -------------------------------- */

export async function listProducts(): Promise<Product[]> {
  const [{ data, error }, found] = await Promise.all([
    db().from("products").select("*").order("created_at", { ascending: false }),
    foundThisWeekByProduct(),
  ]);
  if (error) fail("listProducts", error);
  return (data as ProductRow[]).map((r) => mapProduct(r, found.get(r.id) ?? 0));
}

export async function getProduct(id: string): Promise<Product> {
  const [{ data, error }, found] = await Promise.all([
    db().from("products").select("*").eq("id", id).maybeSingle<ProductRow>(),
    foundThisWeekByProduct(),
  ]);
  if (error) fail("getProduct", error);
  if (!data) throw notFound("Product not found");
  return mapProduct(data, found.get(id) ?? 0);
}

export async function createProduct(p: NewProduct): Promise<Product> {
  const id = await uniqueSlug(p.title);
  const row: Omit<ProductRow, "created_at" | "updated_at"> = {
    id,
    title: p.title,
    short_title: p.shortTitle ?? shortTitleOf(p.title),
    price: p.price,
    currency: "USD",
    stock: p.stock,
    visible: p.visible ?? true,
    details: p.details,
    description: p.description,
    ai_added: p.aiAdded ?? null,
    transcript: p.transcript ?? null,
    transcript_lang: p.transcriptLang ?? null,
    art: p.art ?? "generic",
    tint: p.tint ?? "#EFE7D6",
    photos: p.photos ?? [],
    sold: 0,
  };
  const { data, error } = await db().from("products").insert(row).select("*").single<ProductRow>();
  if (error) fail("createProduct", error);
  return mapProduct(data, 0);
}

export async function updateProduct(id: string, patch: Partial<NewProduct>): Promise<Product> {
  const row: Partial<ProductRow> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.shortTitle !== undefined) row.short_title = patch.shortTitle;
  if (patch.price !== undefined) row.price = patch.price;
  if (patch.stock !== undefined) row.stock = Math.max(0, patch.stock);
  if (patch.visible !== undefined) row.visible = patch.visible;
  if (patch.details !== undefined) row.details = patch.details;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.aiAdded !== undefined) row.ai_added = patch.aiAdded;
  if (patch.art !== undefined) row.art = patch.art;
  if (patch.tint !== undefined) row.tint = patch.tint;
  if (patch.photos !== undefined) row.photos = patch.photos;
  const { data, error } = await db().from("products").update(row).eq("id", id).select("*").maybeSingle<ProductRow>();
  if (error) fail("updateProduct", error);
  if (!data) throw notFound("Product not found");
  const found = await foundThisWeekByProduct();
  return mapProduct(data, found.get(id) ?? 0);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await db().from("products").delete().eq("id", id);
  if (error) fail("deleteProduct", error);
}

async function foundThisWeekByProduct(): Promise<Map<string, number>> {
  const { data, error } = await db()
    .from("searches")
    .select("product_id")
    .eq("found", true)
    .gte("created_at", weekAgo());
  if (error) fail("foundThisWeek", error);
  const m = new Map<string, number>();
  for (const r of data as { product_id: string | null }[]) {
    if (r.product_id) m.set(r.product_id, (m.get(r.product_id) ?? 0) + 1);
  }
  return m;
}

const ARTS: ProductArt[] = ["cushion", "spoons", "rug", "generic"];

function mapProduct(r: ProductRow, foundThisWeek: number): Product {
  return {
    id: r.id,
    title: r.title,
    shortTitle: r.short_title,
    price: Number(r.price),
    currency: r.currency,
    stock: r.stock,
    visible: r.visible,
    details: r.details ?? [],
    description: r.description,
    aiAdded: r.ai_added,
    transcript: r.transcript,
    transcriptLang: r.transcript_lang,
    art: ARTS.includes(r.art as ProductArt) ? (r.art as ProductArt) : "generic",
    tint: r.tint,
    photos: r.photos ?? [],
    foundThisWeek,
    sold: r.sold,
    createdAt: r.created_at,
  };
}

/**
 * `base` is the absolute origin for photo links. Photos are stored as data URLs; agents get a small
 * public URL per photo (/api/catalog/[id]/photos/[n]) instead of the base64 inline.
 */
export function toCatalogItem(p: Product, base: string): CatalogItem {
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    currency: p.currency,
    inStock: p.stock,
    details: p.details,
    description: p.aiAdded ? `${p.description} ${p.aiAdded}` : p.description,
    photos: p.photos.map((ph, i) => ({ url: `${base}/api/catalog/${encodeURIComponent(p.id)}/photos/${i}`, label: ph.label })),
  };
}

function shortTitleOf(title: string) {
  const words = title.replace(/^(hand[- ]?\w+|handmade)\s+/i, "").split(/\s+/);
  return words.slice(-2).join(" ").replace(/^\w/, (c) => c.toUpperCase());
}

async function uniqueSlug(title: string) {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  let base = "";
  for (const w of words) {
    if (base && base.length + 1 + w.length > 40) break;
    base = base ? `${base}-${w}` : w;
  }
  if (!base) base = "product";
  const { data, error } = await db().from("products").select("id").like("id", `${base}%`);
  if (error) fail("uniqueSlug", error);
  const taken = new Set((data as { id: string }[]).map((r) => r.id));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

/* ------------------------------- catalogue -------------------------------- */

/**
 * Agent-facing search over visible, in-stock products. Simple scoring on title,
 * details and description; logs the query so the seller sees what agents wanted.
 */
export async function searchCatalog(query: string, agent: string | null, base: string): Promise<CatalogItem[]> {
  const [products, shop] = await Promise.all([listProducts(), getShop()]);
  const live = shop.open ? products.filter((p) => p.visible && p.stock > 0) : [];
  const q = query.trim().toLowerCase();
  const terms = q.split(/\s+/).filter((t) => t.length > 1);
  const scored = live
    .map((p) => {
      const hay = [p.title, ...p.details, p.description, p.aiAdded ?? ""].join(" ").toLowerCase();
      const titleHay = p.title.toLowerCase();
      let score = 0;
      for (const t of terms) {
        const stem = t.replace(/(es|s)$/, "");
        if (titleHay.includes(stem)) score += 3;
        else if (hay.includes(stem)) score += 1;
      }
      return { p, score };
    })
    .filter((s) => (terms.length ? s.score > 0 : true))
    .sort((a, b) => b.score - a.score);
  const results = scored.map((s) => toCatalogItem(s.p, base));
  if (q) {
    const { error } = await db()
      .from("searches")
      .insert({ query: q, found: results.length > 0, product_id: scored[0]?.p.id ?? null, agent });
    if (error) console.error("[searches] log failed:", error.message);
  }
  return results;
}

/* --------------------------------- orders --------------------------------- */

export async function listOrders(): Promise<Order[]> {
  const [{ data, error }, shop] = await Promise.all([
    db().from("orders").select("*").neq("status", "cancelled").order("created_at", { ascending: false }),
    getShop(),
  ]);
  if (error) fail("listOrders", error);
  return (data as OrderRow[]).map((r) => mapOrder(r, shop.lang));
}

export async function getOrder(id: string): Promise<Order> {
  const [{ data, error }, shop] = await Promise.all([
    db().from("orders").select("*").eq("id", id).maybeSingle<OrderRow>(),
    getShop(),
  ]);
  if (error) fail("getOrder", error);
  if (!data) throw notFound("Order not found");
  return mapOrder(data, shop.lang);
}

/** The order behind a pay link: id plus the secret from the link. 404 on mismatch so ids leak nothing. */
export async function getOrderForBuyer(id: string, token: string | null): Promise<Order> {
  const order = await getOrder(id);
  if (!token || token !== order.payToken) throw notFound("Order not found");
  return order;
}

export async function getOrderByPayPalId(paypalOrderId: string): Promise<Order> {
  const [{ data, error }, shop] = await Promise.all([
    db().from("orders").select("*").eq("paypal_order_id", paypalOrderId).maybeSingle<OrderRow>(),
    getShop(),
  ]);
  if (error) fail("getOrderByPayPalId", error);
  if (!data) throw notFound("Order not found");
  return mapOrder(data, shop.lang);
}

/** A cart an agent has built: reserved id, nothing paid yet. */
export async function createPendingOrder(items: OrderItem[], agent: string | null): Promise<Order> {
  const amount = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const row = {
    status: "pending",
    amount,
    currency: "USD",
    items: items.map((i) => ({ product_id: i.productId, title: i.title, qty: i.qty, unit_price: i.unitPrice })),
    agent,
  };
  const [{ data, error }, shop] = await Promise.all([
    db().from("orders").insert(row).select("*").single<OrderRow>(),
    getShop(),
  ]);
  if (error) fail("createPendingOrder", error);
  return mapOrder(data, shop.lang);
}

export async function attachPayPalOrder(id: string, paypalOrderId: string): Promise<void> {
  const { error } = await db().from("orders").update({ paypal_order_id: paypalOrderId }).eq("id", id);
  if (error) fail("attachPayPalOrder", error);
}

export async function markPaid(
  id: string,
  paid: {
    captureId: string;
    buyerName: string | null;
    buyerEmail: string | null;
    shipping: OrderRow["shipping"];
    paidAt?: string;
  }
): Promise<Order> {
  const current = await getOrder(id);
  if (current.status !== "pending") return current; // idempotent: a second capture callback changes nothing
  const { data, error } = await db()
    .from("orders")
    .update({
      status: "paid",
      paypal_capture_id: paid.captureId,
      buyer_name: paid.buyerName,
      buyer_email: paid.buyerEmail,
      shipping: paid.shipping,
      paid_at: paid.paidAt ?? new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single<OrderRow>();
  if (error) fail("markPaid", error);
  // Stock and sold counters.
  for (const item of current.items) {
    const { data: p } = await db().from("products").select("stock, sold").eq("id", item.productId).maybeSingle<{ stock: number; sold: number }>();
    if (!p) continue;
    await db()
      .from("products")
      .update({ stock: Math.max(0, p.stock - item.qty), sold: p.sold + item.qty })
      .eq("id", item.productId);
  }
  const shop = await getShop();
  return mapOrder(data, shop.lang);
}

export async function markShipped(id: string, carrier: string, tracking: string): Promise<Order> {
  const current = await getOrder(id);
  if (current.status !== "paid") throw badRequest(`Order ${id} is ${current.status}, not waiting to ship`);
  const { data, error } = await db()
    .from("orders")
    .update({ status: "shipped", carrier, tracking, shipped_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle<OrderRow>();
  if (error) fail("markShipped", error);
  if (!data) throw notFound("Order not found");
  const shop = await getShop();
  return mapOrder(data, shop.lang);
}

/** Paid but not shipped yet, and refunded in PayPal: close the order and put the stock back. */
export async function markRefunded(id: string, refundId: string): Promise<Order> {
  const current = await getOrder(id);
  if (current.status === "refunded") return current;
  if (current.status !== "paid") throw badRequest(`Order ${id} is ${current.status}; only a paid order that has not shipped can be refunded`);
  const { data, error } = await db()
    .from("orders")
    .update({ status: "refunded", paypal_refund_id: refundId, refunded_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "paid")
    .select("*")
    .maybeSingle<OrderRow>();
  if (error) fail("markRefunded", error);
  if (!data) return getOrder(id); // refunded by a parallel request
  for (const item of current.items) {
    const { data: p } = await db().from("products").select("stock, sold").eq("id", item.productId).maybeSingle<{ stock: number; sold: number }>();
    if (!p) continue;
    await db()
      .from("products")
      .update({ stock: p.stock + item.qty, sold: Math.max(0, p.sold - item.qty) })
      .eq("id", item.productId);
  }
  const shop = await getShop();
  return mapOrder(data, shop.lang);
}

/** Undo from the toast: back to paid. */
export async function unship(id: string): Promise<Order> {
  const current = await getOrder(id);
  if (current.status !== "shipped") throw badRequest(`Order ${id} is ${current.status}, not shipped`);
  const { data, error } = await db()
    .from("orders")
    .update({ status: "paid", carrier: null, tracking: null, shipped_at: null })
    .eq("id", id)
    .select("*")
    .maybeSingle<OrderRow>();
  if (error) fail("unship", error);
  if (!data) throw notFound("Order not found");
  const shop = await getShop();
  return mapOrder(data, shop.lang);
}

export function mapOrder(r: OrderRow, lang: SellerLang): Order {
  const items: OrderItem[] = (r.items ?? []).map((i) => ({
    productId: i.product_id,
    title: i.title,
    qty: i.qty,
    unitPrice: Number(i.unit_price),
  }));
  const base = {
    id: r.id,
    status: r.status,
    amount: Number(r.amount),
    currency: r.currency,
    items,
    buyerName: r.buyer_name,
  };
  return {
    ...base,
    agent: r.agent,
    buyerEmail: r.buyer_email,
    address: mapAddress(r),
    carrier: r.carrier,
    tracking: r.tracking,
    paypalOrderId: r.paypal_order_id,
    paypalCaptureId: r.paypal_capture_id,
    paypalRefundId: r.paypal_refund_id,
    payToken: r.token,
    cartBuiltAt: r.cart_built_at,
    paidAt: r.paid_at,
    shippedAt: r.shipped_at,
    deliveredAt: r.delivered_at,
    refundedAt: r.refunded_at,
    summary: orderSummary(base, lang),
    story: orderStory(base, lang),
    lang,
  };
}

function mapAddress(r: OrderRow): Address | null {
  const s = r.shipping;
  if (!s && !r.buyer_name) return null;
  const a = s?.address;
  return {
    name: s?.name?.full_name ?? r.buyer_name,
    line1: a?.address_line_1 ?? null,
    line2: a?.address_line_2 ?? null,
    city: a?.admin_area_2 ?? null,
    region: a?.admin_area_1 ?? null,
    postal: a?.postal_code ?? null,
    country: a?.country_code ?? null,
  };
}

/* -------------------------------- searches -------------------------------- */

export async function searchesReport(): Promise<SearchesReport> {
  const [{ data, error }, products] = await Promise.all([
    db().from("searches").select("*").gte("created_at", weekAgo()).order("created_at", { ascending: false }),
    listProducts(),
  ]);
  if (error) fail("searchesReport", error);
  const rows = data as SearchRow[];
  const byQuery = new Map<string, { count: number; found: number; productId: string | null }>();
  for (const r of rows) {
    const k = r.query.toLowerCase();
    const e = byQuery.get(k) ?? { count: 0, found: 0, productId: null };
    e.count += 1;
    if (r.found) e.found += 1;
    if (r.product_id) e.productId = r.product_id;
    byQuery.set(k, e);
  }
  const top = Math.max(1, ...[...byQuery.values()].map((e) => e.count));
  const searches: AgentSearch[] = [...byQuery.entries()]
    .map(([query, e]) => {
      const product = e.productId ? products.find((p) => p.id === e.productId) : undefined;
      const status = product && !product.visible ? "paused" : e.found > 0 ? "ok" : "miss";
      return {
        id: `s-${query.replace(/[^a-z0-9]+/g, "-")}`,
        query,
        count: e.count,
        status: status as AgentSearch["status"],
        share: e.count / top,
        productId: e.productId,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const miss = searches.find((s) => s.status === "miss");
  return {
    period: "This week",
    total: rows.length,
    found: rows.filter((r) => r.found).length,
    searches,
    insight: miss ? { query: miss.query, count: miss.count } : null,
  };
}

export async function recentSearches(limit = 10): Promise<SearchRow[]> {
  const { data, error } = await db()
    .from("searches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("recentSearches", error);
  return data as SearchRow[];
}

export async function countSearchesSince(iso: string): Promise<number> {
  const { count, error } = await db()
    .from("searches")
    .select("id", { count: "exact", head: true })
    .gte("created_at", iso);
  if (error) fail("countSearchesSince", error);
  return count ?? 0;
}
