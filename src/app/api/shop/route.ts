import { z } from "zod";
import { handler, json, parseBody } from "@/lib/server/http";
import { getShop, updateShop } from "@/lib/server/store";

export const GET = handler(async () => json(await getShop()));

const Patch = z.object({
  name: z.string().min(1).max(60).optional(),
  lang: z.enum(["ar", "he", "en"]).optional(),
  open: z.boolean().optional(),
  paypalEmail: z.string().email().nullable().optional(),
  onboarded: z.boolean().optional(),
  notifyPaid: z.boolean().optional(),
  notifyNoMatch: z.boolean().optional(),
  notifyWeekly: z.boolean().optional(),
});

export const PATCH = handler(async (req: Request) => json(await updateShop(await parseBody(req, Patch))));
