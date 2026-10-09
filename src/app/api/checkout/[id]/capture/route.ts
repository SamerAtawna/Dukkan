import type { NextRequest } from "next/server";
import { badRequest, handler, json } from "@/lib/server/http";
import { buyerOf, captureOrder, completedCapture, getOrder as getPayPalOrder, PayPalError, type PayPalOrder } from "@/lib/server/paypal";
import { getOrderForBuyer, markPaid } from "@/lib/server/store";
import type { Order } from "@/lib/types";

/**
 * POST /api/checkout/[id]/capture: the buyer approved in PayPal, take the money.
 * Idempotent: a second call (or an already-captured order) returns the paid order.
 */
export const POST = handler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const order = await getOrderForBuyer(id, req.nextUrl.searchParams.get("t"));
  if (!order.paypalOrderId) throw badRequest("This order has no PayPal order attached");
  if (order.status !== "pending") return json({ order: forBuyer(order), alreadyPaid: true });

  let pp: PayPalOrder;
  try {
    pp = await captureOrder(order.paypalOrderId);
  } catch (err) {
    if (err instanceof PayPalError && err.code === "ORDER_ALREADY_CAPTURED") {
      pp = await getPayPalOrder(order.paypalOrderId);
    } else {
      throw err;
    }
  }

  const capture = completedCapture(pp);
  if (!capture) {
    // Approved but not completed (for example PENDING review). Tell the caller honestly.
    return json({ order: forBuyer(order), pending: true, paypalStatus: pp.status }, { status: 202 });
  }

  const buyer = buyerOf(pp);
  const paid = await markPaid(id, {
    captureId: capture.id,
    buyerName: buyer.name,
    buyerEmail: buyer.email,
    shipping: buyer.shipping,
    paidAt: capture.createTime,
  });
  return json({ order: forBuyer(paid) });
});

/** The buyer sees their own receipt, not the seller's record. */
function forBuyer(o: Order) {
  return { orderId: o.id, status: o.status, buyerName: o.buyerName, paidAt: o.paidAt, amount: o.amount, currency: o.currency };
}
