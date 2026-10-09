"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useShop } from "@/lib/store";
import { hasProducts, useProducts } from "@/lib/store-products";
import { formatPrice, type HomeFeed } from "@/lib/types";
import { HomeEmpty } from "@/components/home/home-empty";
import { ShopLoader } from "@/components/scene/shop-loader";
import { Hero3D } from "@/components/home/hero-3d";
import { Headline } from "@/components/home/headline";
import { StatusSwitch } from "@/components/home/status-switch";
import { CommandBar } from "@/components/home/command-bar";
import { LatestList } from "@/components/home/latest-list";
import { ButtonLink } from "@/components/ui/button";
import { TabBar } from "@/components/nav/tab-bar";
import { TopNav } from "@/components/nav/top-nav";

/** How often the home screen asks for new orders and searches. */
const POLL_MS = 4000;
/** `?demo=paid` replays the design's 2.2s "order paid" beat without a real payment. */
const DEMO_PAID_DELAY_MS = 2200;

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-ground" />}>
      <Home />
    </Suspense>
  );
}

function Home() {
  const params = useSearchParams();
  const demoPaid = params.get("demo") === "paid";

  const name = useShop((s) => s.name);
  const open = useShop((s) => s.open);
  const agents = useShop((s) => s.agents);
  const setAgents = useShop((s) => s.setAgents);
  const shopLoaded = useShop((s) => s.loaded);
  const loadShop = useShop((s) => s.load);
  const productsLoaded = useProducts((s) => s.loaded);
  const loadProducts = useProducts((s) => s.load);
  const anyProducts = useProducts(hasProducts);

  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [newPaidId, setNewPaidId] = useState<string | null>(null);
  const firstPaid = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    void loadShop();
    void loadProducts();
  }, [loadShop, loadProducts]);

  // Poll the feed. The first response sets the baseline; a later paid order is "new":
  // the count rolls 2 → 3, the coin drops and the row slides in (the design's paid beat).
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const f = await api.get<HomeFeed>("/api/home");
        if (stop) return;
        setFeed(f);
        if (firstPaid.current === undefined) firstPaid.current = f.latestPaidId;
        else if (f.latestPaidId && f.latestPaidId !== firstPaid.current) {
          firstPaid.current = f.latestPaidId;
          setNewPaidId(f.latestPaidId);
          setAgents(3);
          void loadProducts();
        }
      } catch {
        /* backend not configured: the hero still works, the list stays empty */
      }
      if (!stop) timer = setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [setAgents, loadProducts]);

  useEffect(() => {
    if (!demoPaid) return;
    const t = setTimeout(() => {
      setAgents(3);
      setNewPaidId((id) => id ?? feed?.latestPaidId ?? "demo");
    }, DEMO_PAID_DELAY_MS);
    return () => clearTimeout(t);
    // Only on first open of the home screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoPaid]);

  const three = agents === 3;

  if (!shopLoaded || !productsLoaded)
    return (
      <div className="min-h-dvh bg-ground">
        <ShopLoader page label="Opening your shop…" />
      </div>
    );

  // First run: no products yet (HomeEmpty.dc.html).
  if (!anyProducts) return <HomeEmpty />;

  const today = feed?.today ?? { orders: 0, paid: 0, searches: 0 };

  return (
    <div className="flex min-h-dvh flex-col bg-ground text-text">
      <TopNav className="hidden md:flex" />

      <main className="col">
        {/* Phone header: shop name + status switch. On desktop these live in the top bar. */}
        <div className="flex items-center justify-between gap-3 md:hidden">
          <Link href="/settings" className="hd inline-flex min-h-11 items-center text-[0.9375rem] font-semibold tracking-[-0.01em]">
            {name}
          </Link>
          <StatusSwitch />
        </div>

        <Hero3D open={open} third={three} />

        <Headline open={open} agents={agents} />

        <p className="m-0 text-[0.9375rem] leading-normal text-text-2 md:text-lg" aria-live="polite">
          Today: {today.orders} {today.orders === 1 ? "order" : "orders"} and <span className="amt">{formatPrice(today.paid)}</span> paid.{" "}
          {today.searches} agent {today.searches === 1 ? "search" : "searches"}.
        </p>

        <CommandBar />

        <div className="flex flex-wrap gap-2 md:gap-2.5">
          <ButtonLink href="/add" className="px-3.5 text-[0.8125rem] md:px-[18px] md:text-sm">
            Add a product
          </ButtonLink>
          <ButtonLink href="/orders" className="px-3.5 text-[0.8125rem] md:px-[18px] md:text-sm">
            <span className="md:hidden">Orders</span>
            <span className="hidden md:inline">Today&apos;s orders</span>
          </ButtonLink>
          <ButtonLink href="/searches" className="px-3.5 text-[0.8125rem] md:px-[18px] md:text-sm">
            <span className="md:hidden">Agent searches</span>
            <span className="hidden md:inline">What agents looked for</span>
          </ButtonLink>
        </div>

        <LatestList events={feed?.events ?? []} newPaidId={newPaidId} />

        <TabBar className="md:hidden" />
      </main>
    </div>
  );
}
