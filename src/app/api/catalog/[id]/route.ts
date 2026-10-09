import { appUrl, handler, json, notFound } from "@/lib/server/http";
import { getProduct, getShop, toCatalogItem } from "@/lib/server/store";

/** GET /api/catalog/[id]: one product as agents see it. Hidden or closed-shop products 404. */
export const GET = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const [product, shop] = await Promise.all([getProduct(id), getShop()]);
  if (!product.visible || !shop.open) throw notFound("Product not available");
  return json(toCatalogItem(product, appUrl(req, "")));
});
