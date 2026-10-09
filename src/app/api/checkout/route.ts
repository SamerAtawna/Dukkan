import { z } from "zod";
import { appUrl, badRequest, handler, json, parseBody } from "@/lib/server/http";
import { createOrder } from "@/lib/server/paypal";
import { attachPayPalOrder, createPendingOrder, getProduct, getShop } from "@/lib/server/store";
import type { CheckoutResult, OrderItem } from "@/lib/types";

const Body = z.object({
  items: z.array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(50) })).min(1).max(20),
  agent: z.string().max(80).optional(),
});

/**
 * POST /api/checkout: an agent (or the pay page) turns a cart into a PayPal order.
 * We reserve a Dukkan order id first so the PayPal order carries it as custom_id,
 * then hand back a pay page URL (PayPal button) and the raw PayPal approval link.
 */
export const POST = handler(async (req: Request) => {
  const body = await parseBody(req, Body);
  const agent = body.agent ?? req.headers.get("x-agent");
  const shop = await getShop();
  if (!shop.open) throw badRequest("The shop is closed right now");

  const items: OrderItem[] = [];
  for (const line of body.items) {
    const p = await getProduct(line.productId);
    if (!p.visible) throw badRequest(`${p.title} is not available`);
    if (p.stock < line.qty) throw badRequest(`Only ${p.stock} of ${p.title} in stock`);
    items.push({ productId: p.id, title: p.title, qty: line.qty, unitPrice: p.price });
  }

  const order = await createPendingOrder(items, agent);
  const payUrl = appUrl(req, `/pay/${order.id}?t=${order.payToken}`);
  const pp = await createOrder({
    customId: order.id,
    brand: shop.name,
    items: items.map((i) => ({ sku: i.productId, name: i.title, quantity: i.qty, unitPrice: i.unitPrice })),
    returnUrl: `${payUrl}&return=1`,
    cancelUrl: `${payUrl}&cancel=1`,
  });
  await attachPayPalOrder(order.id, pp.id);

  const result: CheckoutResult = {
    orderId: order.id,
    paypalOrderId: pp.id,
    total: order.amount,
    currency: order.currency,
    payUrl,
    approveUrl: pp.approveUrl ?? null,
    items,
  };
  return json(result, { status: 201 });
});
