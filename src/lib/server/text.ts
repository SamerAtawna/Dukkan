import "server-only";
import type { Order, SellerLang } from "@/lib/types";

/**
 * Seller-facing copy in the seller's language. Deterministic templates: they must
 * be instant at capture time and identical every time the row is read.
 * Interface text stays English (DESIGN.md content rules).
 */

const digitsAr = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const arabicDigits = (s: string) => s.replace(/\d/g, (d) => digitsAr[Number(d)]);

function itemsLine(o: Pick<Order, "items">, lang: SellerLang) {
  const first = o.items[0];
  const qty = o.items.reduce((s, i) => s + i.qty, 0);
  if (!first) return "";
  if (lang === "ar") {
    const count = qty === 1 ? "قطعة واحدة" : qty === 2 ? "قطعتان" : `${arabicDigits(String(qty))} قطع`;
    return `${first.title} · ${count}`;
  }
  if (lang === "he") {
    const count = qty === 1 ? "פריט אחד" : `${qty} פריטים`;
    return `${first.title} · ${count}`;
  }
  return `${first.title} · ${qty === 1 ? "1 item" : `${qty} items`}`;
}

function amount(o: Pick<Order, "amount" | "currency">, lang: SellerLang) {
  const n = o.amount.toFixed(2).replace(/\.00$/, "");
  if (lang === "ar") return `${arabicDigits(n)} دولار`;
  if (lang === "he") return `${n} דולר`;
  return `$${n}`;
}

export function orderSummary(o: Pick<Order, "items" | "status" | "amount" | "currency">, lang: SellerLang): string {
  return itemsLine(o, lang);
}

export function orderStory(
  o: Pick<Order, "id" | "items" | "status" | "amount" | "currency" | "buyerName">,
  lang: SellerLang
): string {
  const items = itemsLine(o, lang);
  const amt = amount(o, lang);
  if (lang === "ar") {
    const id = arabicDigits(o.id);
    switch (o.status) {
      case "pending":
        return `وكيل يجهّز سلة: ${items}. لم يتم الدفع بعد.`;
      case "paid":
        return `طلب جديد: ${items}. تم الدفع ${amt} عبر PayPal. باقي عليكِ الشحن فقط.`;
      case "shipped":
        return `طلب ${id}: ${items}. تم الدفع ${amt} عبر PayPal وتم شحنه.`;
      case "delivered":
        return `طلب ${id}: ${items}. تم الدفع ${amt} عبر PayPal ووصل إلى المشتري.`;
      case "cancelled":
        return `طلب ${id}: ${items}. أُلغي قبل الدفع.`;
    }
  }
  if (lang === "he") {
    switch (o.status) {
      case "pending":
        return `סוכן מרכיב עגלה: ${items}. עדיין לא שולם.`;
      case "paid":
        return `הזמנה חדשה: ${items}. שולם ${amt} דרך PayPal. נשאר רק לשלוח.`;
      case "shipped":
        return `הזמנה ${o.id}: ${items}. שולם ${amt} דרך PayPal ונשלח.`;
      case "delivered":
        return `הזמנה ${o.id}: ${items}. שולם ${amt} דרך PayPal והגיע לקונה.`;
      case "cancelled":
        return `הזמנה ${o.id}: ${items}. בוטלה לפני התשלום.`;
    }
  }
  switch (o.status) {
    case "pending":
      return `An agent is building a cart: ${items}. Not paid yet.`;
    case "paid":
      return `New order: ${items}. ${amt} paid with PayPal. You only need to ship it.`;
    case "shipped":
      return `Order ${o.id}: ${items}. ${amt} paid with PayPal and shipped.`;
    case "delivered":
      return `Order ${o.id}: ${items}. ${amt} paid with PayPal and delivered.`;
    case "cancelled":
      return `Order ${o.id}: ${items}. Cancelled before payment.`;
  }
}

export function paidEventSummary(o: Pick<Order, "id">, lang: SellerLang): string {
  if (lang === "ar") return `تم دفع الطلب ${arabicDigits(o.id)} · `;
  if (lang === "he") return `הזמנה ${o.id} שולמה · `;
  return `Order ${o.id} paid · `;
}

export function cartEventSummary(o: Pick<Order, "items">, lang: SellerLang): string {
  const first = o.items[0]?.title ?? "";
  if (lang === "ar") return `وكيل وجد «${first}» ويجهّز السلة`;
  if (lang === "he") return `סוכן מצא «${first}» ומרכיב עגלה`;
  return `An agent found “${first}” and is building a cart`;
}

export function noMatchEventSummary(query: string, lang: SellerLang): string {
  if (lang === "ar") return `وكيل بحث عن «${query}» — غير موجود عندك`;
  if (lang === "he") return `סוכן חיפש «${query}» — אין לך את זה`;
  return `An agent searched “${query}” — you don't sell it`;
}

export function liveEventSummary(title: string, lang: SellerLang): string {
  if (lang === "ar") return `${title} أصبح معروضاً للوكلاء`;
  if (lang === "he") return `${title} זמין עכשיו לסוכנים`;
  return `${title} is now live for agents`;
}
