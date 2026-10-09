import { z } from "zod";
import { handler, json, parseBody } from "@/lib/server/http";
import { addTracking } from "@/lib/server/paypal";
import { getOrder, markShipped, unship } from "@/lib/server/store";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Ctx) => json(await getOrder((await params).id)));

const Patch = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ship"), carrier: z.string().min(1).max(60), tracking: z.string().min(1).max(80) }),
  z.object({ action: z.literal("unship") }),
]);

/**
 * PATCH /api/orders/[id] with { action: "ship", carrier, tracking } or { action: "unship" } (toast Undo).
 * Shipping also pushes the tracking number to PayPal so the buyer's agent sees it there.
 */
export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const body = await parseBody(req, Patch);
  if (body.action === "unship") return json(await unship(id));

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
