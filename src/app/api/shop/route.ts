import { z } from "zod";
import { handler, json, parseBody } from "@/lib/server/http";
import { getShop, updateShop } from "@/lib/server/store";

export const GET = handler(async () => json(await getShop()));

const Patch = z.object({
  name: z.string().min(1).max(60).optional(),
  lang: z.enum(["ar", "he", "en"]).optional(),
  open: z.boolean().optional(),
  // Only null (Disconnect). Connecting happens through Log in with PayPal (/api/paypal/login),
  // so nobody can point payments at an account they have not signed in to.
  paypalEmail: z.null().optional(),
  onboarded: z.boolean().optional(),
  notifyPaid: z.boolean().optional(),
  notifyNoMatch: z.boolean().optional(),
  notifyWeekly: z.boolean().optional(),
});

export const PATCH = handler(async (req: Request) => json(await updateShop(await parseBody(req, Patch))));
