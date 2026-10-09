import { z } from "zod";
import { badRequest, handler, json, parseBody } from "@/lib/server/http";
import { addTracking, refundCapture } from "@/lib/server/paypal";
import { getOrder, getShop, markRefunded, markShipped, unship } from "@/lib/server/store";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Ctx) => json(await getOrder((await params).id)));

const Patch = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ship"), carrier: z.string().min(1).max(60), tracking: z.string().min(1).max(80) }),
  z.object({ action: z.literal("unship") }),
  z.object({ action: z.literal("refund") }),
]);

/**
 * PATCH /api/orders/[id] with { action: "ship", carrier, tracking }, { action: "unship" } (toast Undo)
 * or { action: "refund" } (full PayPal refund of a paid order that has not shipped; stock goes back).
 * Shipping also pushes the tracking number to PayPal so the buyer's agent sees it there.
 */
export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const body = await parseBody(req, Patch);
  if (body.action === "unship") return json(await unship(id));
  if (body.action === "refund") {
    // Money first, then our record: PayPal-Request-Id makes a retry after a failed write safe.
    const current = await getOrder(id);
    if (current.status === "refunded") return json(current);
    if (current.status !== "paid") throw badRequest(`Order ${id} is ${current.status}; only a paid order that has not shipped can be refunded`);
    if (!current.paypalCaptureId) throw badRequest(`Order ${id} has no PayPal capture to refund`);
    const shop = await getShop();
    const refund = await refundCapture(current.paypalCaptureId, `Refund from ${shop.name} for order ${id}`);
    return json(await markRefunded(id, refund.id));
  }

  const order = await markShipped(id, body.carrier, body.tracking);
  if (order.paypalOrderId && order.paypalCaptureId) {
    try {
      await addTracking(order.paypalOrderId, order.paypalCaptureId, body.carrier, body.tracking);
    } catch (err) {
      // Tracking is a courtesy; the order is shipped either way.
      console.error("[paypal] add tracking failed:", err instanceof Error ? err.message : err);
    }
  }
  return json(order);
});
