/**
 * Seed the Supabase project with a demo shop so the first screen is not empty.
 *   npm run seed            (reads .env.local; safe to run again, it upserts)
 * Standalone on purpose: it does not import the Next.js server modules.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const daysAgo = (d: number, hour = 10) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(hour, 12, 0, 0);
  return x.toISOString();
};

async function main() {
  await must(db.from("shop").upsert({ id: 1, name: "Salma Crafts", lang: "ar", open: true, onboarded: true }), "shop");

  const products = [
    {
      id: "cushion-cover",
      title: "Hand-embroidered cushion cover",
      short_title: "Cushion cover",
      price: 35,
      stock: 3,
      visible: true,
      details: ["Cotton", "45 × 45 cm", "Red and black"],
      description: "A cushion cover embroidered by hand in red and black on soft cotton. Fits a standard 45 × 45 cm cushion.",
      ai_added: "Made by Salma in Hura.",
      transcript: "مخدة مطرزة يدوياً، قماش قطن، مقاس ٤٥ في ٤٥ سنتيمتر، ألوان أحمر وأسود. السعر ٣٥ دولار.",
      transcript_lang: "ar",
      art: "cushion",
      tint: "#EFE7D6",
      sold: 1,
      created_at: daysAgo(6, 9),
    },
    {
      id: "olive-wood-spoons",
      title: "Olive wood spoon set",
      short_title: "Spoon set",
      price: 18,
      stock: 12,
      visible: true,
      details: ["Olive wood", "Set of 3", "Hand-carved"],
      description: "Three spoons carved from olive wood, each a slightly different grain. Oiled and ready to use.",
      ai_added: null,
      transcript: "طقم ملاعق من خشب الزيتون، ثلاث ملاعق، منحوتة باليد. السعر ١٨ دولار.",
      transcript_lang: "ar",
      art: "spoons",
      tint: "#E8EDE0",
      sold: 2,
      created_at: daysAgo(5, 14),
    },
    {
      id: "wool-rug",
      title: "Hand-woven wool rug",
      short_title: "Wool rug",
      price: 120,
      stock: 1,
      visible: false,
      details: ["Wool", "120 × 80 cm", "Terracotta"],
      description: "A small rug woven by hand on a floor loom in terracotta and cream wool. One piece only.",
      ai_added: null,
      transcript: "سجادة صوف منسوجة يدوياً، ١٢٠ في ٨٠ سنتيمتر، لون طوبي. قطعة واحدة. ١٢٠ دولار.",
      transcript_lang: "ar",
      art: "rug",
      tint: "#EADFD6",
      sold: 0,
      created_at: daysAgo(4, 11),
    },
  ];
  await must(db.from("products").upsert(products), "products");

  // Two finished orders so the Orders screen has history. New ones come from the real checkout.
  const cushion = { product_id: "cushion-cover", title: "Hand-embroidered cushion cover", qty: 1, unit_price: 35 };
  const spoons = { product_id: "olive-wood-spoons", title: "Olive wood spoon set", qty: 1, unit_price: 18 };
  const orders = [
    {
      id: "1041",
      status: "shipped",
      amount: 35,
      items: [cushion],
      agent: "Perplexity shopping",
      buyer_name: "Maya Levi",
      buyer_email: "maya@example.com",
      shipping: {
        name: { full_name: "Maya Levi" },
        address: { address_line_1: "12 Rothschild Blvd", admin_area_2: "Tel Aviv", postal_code: "6688112", country_code: "IL" },
      },
      carrier: "Israel Post",
      tracking: "RR 123 456 789 IL",
      cart_built_at: daysAgo(1, 15),
      paid_at: daysAgo(1, 16),
      shipped_at: daysAgo(1, 18),
      created_at: daysAgo(1, 15),
    },
    {
      id: "1039",
      status: "delivered",
      amount: 18,
      items: [spoons],
      agent: "Copilot checkout",
      buyer_name: "Jonas Weber",
      buyer_email: "jonas@example.com",
      shipping: {
        name: { full_name: "Jonas Weber" },
        address: { address_line_1: "Torstraße 8", admin_area_2: "Berlin", postal_code: "10119", country_code: "DE" },
      },
      carrier: "DHL",
      tracking: "JD014600003123456789",
      cart_built_at: daysAgo(4, 10),
      paid_at: daysAgo(4, 10),
      shipped_at: daysAgo(3, 9),
      delivered_at: daysAgo(1, 12),
      created_at: daysAgo(4, 10),
    },
  ];
  await must(db.from("orders").upsert(orders), "orders");
  // A week of agent searches, including the one thing the shop does not sell.
  const q = (query: string, found: boolean, product_id: string | null, h: number, agent = "Perplexity shopping") => ({
    query,
    found,
    product_id,
    agent,
    created_at: hoursAgo(h),
  });
  const searches = [
    ...Array.from({ length: 12 }, (_, i) => q("embroidered cushion", true, "cushion-cover", 2 + i * 11)),
    ...Array.from({ length: 7 }, (_, i) => q("olive oil soap", false, null, 1 + i * 19, "Copilot checkout")),
    ...Array.from({ length: 5 }, (_, i) => q("olive wood spoons", true, "olive-wood-spoons", 5 + i * 23)),
    ...Array.from({ length: 4 }, (_, i) => q("wool rug", true, "wool-rug", 8 + i * 30)),
    ...Array.from({ length: 3 }, (_, i) => q("ceramic mug", false, null, 12 + i * 40, "Gemini shopping")),
  ];
  const { count } = await db.from("searches").select("id", { count: "exact", head: true });
  if (!count) await must(db.from("searches").insert(searches), "searches");

  console.log("Seeded: Salma Crafts, 3 products, 2 past orders, 31 agent searches.");
}

async function must<T extends { error: { message: string } | null }>(p: PromiseLike<T>, what: string) {
  const r = await p;
  if (r.error) {
    console.error(`${what}: ${r.error.message}`);
    process.exit(1);
  }
}

main();
