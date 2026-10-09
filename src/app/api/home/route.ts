import { handler, json } from "@/lib/server/http";
import { homeFeed } from "@/lib/server/feed";

/** GET /api/home: today's numbers and the latest events. The home page polls this. */
export const GET = handler(async () => json(await homeFeed()));
