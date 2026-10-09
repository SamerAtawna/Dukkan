import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatPrice, type Product } from "@/lib/types";
import { ProductArtwork } from "@/components/products/icons";

/** One product card in the grid. Paused products render desaturated with a warn tag. */
export function ProductTile({ product }: { product: Product }) {
  const { id, title, price, stock, visible, art, tint, photos } = product;
  const tag = !visible ? { cls: "warn", text: "Paused" } : stock === 0 ? { cls: "warn", text: "Sold out" } : { cls: "ok", text: `${stock} left` };
  const photo = photos[0];

  return (
    <Link href={`/products/${id}`} className="card tile item">
      <div className={cn("photo", !visible && "paused")} aria-hidden="true" style={{ background: tint }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- seller photos are data URLs */}
        {photo ? <img src={photo.url} alt="" className="h-full w-full object-cover" /> : <ProductArtwork art={art} />}
      </div>
      <div className="flex flex-col gap-1.5 px-0.5">
        <div className="text-sm font-medium leading-[1.3] [text-wrap:pretty]">{title}</div>
        <div className="flex items-center justify-between gap-2">
          <span className="hd text-[0.9375rem] font-semibold tracking-[-0.01em] text-lime-ink">{formatPrice(price)}</span>
          <span className={cn("tag", tag.cls)}>{tag.text}</span>
        </div>
      </div>
    </Link>
  );
}
