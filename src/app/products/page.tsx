"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./products.css";
import { useProducts, visibleCount } from "@/lib/store-products";
import { TopNav } from "@/components/nav/top-nav";
import { TabBar } from "@/components/nav/tab-bar";
import { MicIcon } from "@/components/icons";
import { PlusIcon } from "@/components/products/icons";
import { ScreenHeader } from "@/components/products/screen-header";
import { ProductTile } from "@/components/products/product-tile";
import { VisibilityCard } from "@/components/products/visibility-card";

export default function ProductsPage() {
  const products = useProducts((s) => s.products);
  const loaded = useProducts((s) => s.loaded);
  const load = useProducts((s) => s.load);
  const visible = useProducts(visibleCount);
  const setVisible = useProducts((s) => s.setVisible);

  useEffect(() => {
    void load();
  }, [load]);

  // Paused products get a visibility card under the grid (Products.dc.html shows one for the rug).
  // Once a card is shown it stays for the visit, so un-pausing does not make it vanish mid-tap.
  // Extra ids added by toggling during the visit; the initial set is whatever was paused when the list arrived.
  const [extraCards, setExtraCards] = useState<string[]>([]);
  const [baseline, setBaseline] = useState<string[] | null>(null);
  const pausedNow = products.filter((p) => !p.visible).map((p) => p.id);
  const cards = baseline ?? (loaded ? pausedNow : []);
  const cardIds = [...new Set([...cards, ...extraCards])];
  const cardProducts = cardIds.map((id) => products.find((p) => p.id === id)).filter((p) => p !== undefined);

  function toggle(id: string, next: boolean) {
    if (baseline === null) setBaseline(cards);
    setVisible(id, next);
    if (!cardIds.includes(id)) setExtraCards((c) => [...c, id]);
  }

  return (
    <div className="r-products flex min-h-dvh flex-col bg-ground text-text">
      <TopNav className="hidden md:flex" />

      <main className="col gap-[18px] md:gap-6">
        <ScreenHeader
          title="Products"
          sub={loaded ? `Agents see ${visible} of ${products.length} ${products.length === 1 ? "product" : "products"}` : "Loading…"}
          backHref="/"
          backLabel="Back to home"
          trailing={
            <Link href="/add" className="icon lime !h-12 !w-12" aria-label="Add a product">
              <MicIcon size={22} />
            </Link>
          }
        />

        <div className="g">
          {products.map((p) => (
            <ProductTile key={p.id} product={p} />
          ))}
          <Link href="/add" className="tile add item">
            <PlusIcon />
            <span className="text-[0.8125rem] font-medium">Add a product</span>
          </Link>
        </div>

        {cardProducts.map((p) => (
          <VisibilityCard
            key={p.id}
            label={`${p.shortTitle} visible to agents`}
            ariaLabel={`${p.shortTitle} visible to agents`}
            hint={p.visible ? "Agents can find it" : "Paused · hidden from agents"}
            checked={p.visible}
            onToggle={() => toggle(p.id, !p.visible)}
          />
        ))}

        <div className="flex-1" />
        <p className="m-0 px-1 text-[0.8125rem] leading-normal text-text-2">
          Tap a product to change its listing. Pausing hides it from agents without deleting it.
        </p>

        <TabBar className="md:hidden" />
      </main>
    </div>
  );
}
