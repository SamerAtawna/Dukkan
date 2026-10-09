import type { NextRequest } from "next/server";
import { handler, json } from "@/lib/server/http";
import { getOrderForBuyer, getShop } from "@/lib/server/store";

/** GET /api/checkout/[id]?t=<token>: what the buyer's pay page needs. No seller-only fields. */
export const GET = handler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const [o, shop] = await Promise.all([getOrderForBuyer(id, req.nextUrl.searchParams.get("t")), getShop()]);
  return json({
    orderId: o.id,
    shop: shop.name,
    status: o.status,
    paypalOrderId: o.paypalOrderId,
    total: o.amount,
    currency: o.currency,
    items: o.items,
    agent: o.agent,
    paidAt: o.paidAt,
    buyerName: o.buyerName,
  });
});
