import { handler, json } from "@/lib/server/http";
import { searchesReport } from "@/lib/server/store";

/** GET /api/searches: what agents looked for this week, grouped by query. */
export const GET = handler(async () => json(await searchesReport()));
