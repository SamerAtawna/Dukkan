import { handler, notFound } from "@/lib/server/http";
import { getProduct, getShop } from "@/lib/server/store";

/**
 * GET /api/catalog/[id]/photos/[n]: one product photo as an image, for agents and the demo agent's
 * product cards. Public under the same rule as the catalogue: hidden products and a closed shop 404.
 */
export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string; n: string }> }) => {
  const { id, n } = await params;
  const [product, shop] = await Promise.all([getProduct(id), getShop()]);
  if (!product.visible || !shop.open) throw notFound("Product not available");
  const photo = product.photos[Number.parseInt(n, 10)];
  const m = photo?.url.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!m) throw notFound("Photo not found");
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" },
  });
});
