import "server-only";
import { cartEventSummary, liveEventSummary, noMatchEventSummary, paidEventSummary, refundedEventSummary } from "@/lib/server/text";
import { countSearchesSince, getShop, latestProducts, listOrders, recentSearches } from "@/lib/server/store";
import { formatPrice, type HomeFeed, type ShopEvent } from "@/lib/types";

const HOUR = 60 * 60 * 1000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/**
 * The home screen in one call: today's numbers and the "Latest" rows,
 * built from real orders, agent searches and listings.
 */
export async function homeFeed(): Promise<HomeFeed> {
  const today = startOfToday();
  const [shop, orders, products, searches, searchesToday] = await Promise.all([
    getShop(),
    listOrders(),
    latestProducts(2),
    recentSearches(12),
    countSearchesSince(today),
  ]);
  const lang = shop.lang;
  const events: ShopEvent[] = [];

  for (const o of orders) {
    if (o.status !== "pending" && o.paidAt) {
      events.push({
        id: `paid-${o.id}`,
        kind: "paid",
        at: o.paidAt,
        summary: o.status === "refunded" ? refundedEventSummary(o, lang) : paidEventSummary(o, lang),
        summaryLang: lang,
        amount: formatPrice(o.amount, o.currency),
        meta: `${hhmm(o.paidAt)} · Order ${o.id} · ${o.status === "refunded" ? "Refunded" : "PayPal"}`,
        action: o.status === "paid" ? { label: "Ship it", href: `/orders/${o.id}` } : { label: "Open", href: `/orders/${o.id}` },
      });
    } else if (o.status === "pending" && Date.now() - new Date(o.cartBuiltAt).getTime() < HOUR) {
      events.push({
        id: `cart-${o.id}`,
        kind: "cart",
        at: o.cartBuiltAt,
        summary: cartEventSummary(o, lang),
        summaryLang: lang,
        meta: `${hhmm(o.cartBuiltAt)} · ${o.items[0]?.title ?? "Cart"} · Cart being built`,
        action: { label: "See listing", href: `/products/${o.items[0]?.productId ?? ""}` },
      });
    }
  }

  const seenMiss = new Set<string>();
  for (const s of searches) {
    if (s.found || seenMiss.has(s.query)) continue;
    seenMiss.add(s.query);
    events.push({
      id: `miss-${s.id}`,
      kind: "nomatch",
      at: s.created_at,
      summary: noMatchEventSummary(s.query, lang),
      summaryLang: lang,
      meta: `${hhmm(s.created_at)} · “${s.query}” · No match`,
      metaWarn: true,
      action: { label: "Add it", href: "/add" },
    });
  }

  for (const p of products) {
    if (!p.visible) continue;
    events.push({
      id: `live-${p.id}`,
      kind: "live",
      at: p.createdAt,
      summary: liveEventSummary(p.title, lang),
      summaryLang: lang,
      meta: `${hhmm(p.createdAt)} · ${p.shortTitle} · Live`,
      action: { label: "See listing", href: `/products/${p.id}` },
    });
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const paidToday = orders.filter((o) => o.paidAt && o.paidAt >= today && o.status !== "refunded");
  const latestPaid = orders.filter((o) => o.paidAt).sort((a, b) => (a.paidAt! < b.paidAt! ? 1 : -1))[0];

  return {
    today: {
      orders: paidToday.length,
      paid: paidToday.reduce((s, o) => s + o.amount, 0),
      searches: searchesToday,
    },
    events: events.slice(0, 4),
    latestPaidId: latestPaid?.id ?? null,
  };
}
