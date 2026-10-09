import type { NextRequest } from "next/server";
import { appUrl, handler, json } from "@/lib/server/http";
import { searchCatalog } from "@/lib/server/store";

/**
 * Agent-facing catalogue search. Public, read-only.
 *   GET /api/catalog?q=embroidered+cushion   (header X-Agent: who is asking, optional)
 * Returns only what a buyer's agent needs: id, title, price, stock, details, description, photos.
 * Every query is logged so the seller sees what agents wanted (/searches).
 */
export const GET = handler(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const agent = req.headers.get("x-agent") ?? req.nextUrl.searchParams.get("agent");
  const items = await searchCatalog(q, agent, appUrl(req, ""));
  return json({
    shop: "Dukkan",
    query: q,
    count: items.length,
    items,
    checkout: { method: "POST", path: "/api/checkout", body: { items: [{ productId: "…", qty: 1 }] } },
  });
});
