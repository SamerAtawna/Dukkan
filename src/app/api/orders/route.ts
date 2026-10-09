import { handler, json } from "@/lib/server/http";
import { listOrders } from "@/lib/server/store";

/** GET /api/orders: every non-cancelled order, newest first, in the seller's language. */
export const GET = handler(async () => json(await listOrders()));
