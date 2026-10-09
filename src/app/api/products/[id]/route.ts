import { z } from "zod";
import { handler, json, parseBody } from "@/lib/server/http";
import { deleteProduct, getProduct, updateProduct } from "@/lib/server/store";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Ctx) => json(await getProduct((await params).id)));

const Patch = z.object({
  title: z.string().min(1).max(200).optional(),
  shortTitle: z.string().min(1).max(60).optional(),
  price: z.number().min(0).max(100000).optional(),
  stock: z.number().int().min(0).max(100000).optional(),
  visible: z.boolean().optional(),
  details: z.array(z.string().max(60)).max(12).optional(),
  description: z.string().max(2000).optional(),
  aiAdded: z.string().max(300).nullable().optional(),
  art: z.enum(["cushion", "spoons", "rug", "generic"]).optional(),
  tint: z.string().max(20).optional(),
  photos: z.array(z.object({ url: z.string().max(2_000_000), label: z.string().max(120) })).max(6).optional(),
});

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const body = await parseBody(req, Patch);
  return json(await updateProduct(id, body));
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  await deleteProduct((await params).id);
  return new Response(null, { status: 204 });
});
