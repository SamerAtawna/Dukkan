import { z } from "zod";
import { handler, json, parseBody } from "@/lib/server/http";
import { createProduct, listProducts } from "@/lib/server/store";

export const GET = handler(async () => json(await listProducts()));

const NewProductBody = z.object({
  title: z.string().min(1).max(200),
  shortTitle: z.string().min(1).max(60).optional(),
  price: z.number().min(0).max(100000),
  stock: z.number().int().min(0).max(100000),
  details: z.array(z.string().max(60)).max(12),
  description: z.string().max(2000),
  aiAdded: z.string().max(300).nullable().optional(),
  transcript: z.string().max(4000).nullable().optional(),
  transcriptLang: z.string().max(20).nullable().optional(),
  art: z.enum(["cushion", "spoons", "rug", "generic"]).optional(),
  tint: z.string().max(20).optional(),
  photos: z.array(z.object({ url: z.string().max(2_000_000), label: z.string().max(120) })).max(6).optional(),
  visible: z.boolean().optional(),
});

/** POST /api/products: publish a listing from /add/review. */
export const POST = handler(async (req: Request) => {
  const body = await parseBody(req, NewProductBody);
  const product = await createProduct(body);
  return json(product, { status: 201 });
});
