"use client";

import "../onboarding.css";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MicIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { OnboardingShell } from "@/components/onboarding/shell";
import { ShopScene } from "@/components/onboarding/shop-scene";
import { useShop } from "@/lib/store";
import { useProducts } from "@/lib/store-products";
import { useShopEntry } from "@/components/scene/shop-entry";

/** Step 3: first-time delight. The lights come on at 0.4s, agents arrive from 1s, then the copy and CTA reveal. */
export default function OpenPage() {
  const router = useRouter();
  const scene = useRef<HTMLDivElement>(null);
  const { entering, enter } = useShopEntry();
  const shopName = useShop((s) => s.name);
  const load = useShop((s) => s.load);
  const save = useShop((s) => s.save);
  const onboarded = useShop((s) => s.onboarded);
  const loaded = useShop((s) => s.loaded);
  const loadProducts = useProducts((s) => s.load);

  // Home waits for the shop and the products before it draws anything. Load both while the
  // celebration plays, so "Go to my shop" lands on a ready home instead of a blank screen.
  useEffect(() => {
    router.prefetch("/");
    void load();
    void loadProducts();
  }, [load, loadProducts, router]);
  // Reaching this screen means setup is done, PayPal or not.
  useEffect(() => {
    if (loaded && !onboarded) void save({ onboarded: true, open: true });
  }, [loaded, onboarded, save]);

  return (
    <OnboardingShell
      step={3}
      phoneLead={<div className="hd text-base font-semibold tracking-[-0.01em]">{shopName || "Dukkan"}</div>}
    >
      <ShopScene ref={scene} sign={shopName} agents lightsAt={400} />

      <div className="card thin ob-pill inline-flex items-center gap-2 self-start rounded-full py-2 pl-2.5 pr-3">
        <span className="dot" />
        <span className="mono text-lime-ink">Open to AI agents</span>
      </div>

      <h1 className="hd ob-h1">
        <span className="w d1">Your</span> <span className="w d2">shop</span> <span className="w d3">is</span>{" "}
        <span className="w d4">open.</span>
      </h1>
      <p className="in i1 m-0 text-[0.9375rem] leading-normal text-text-2">
        Agents can find you the moment you add your first product. Take a photo, say what it is — the listing writes
        itself.
      </p>

      <div className="flex-1" />

      <ButtonLink href="/add" tone="lime" size="big" className="in i2 w-full">
        <MicIcon size={20} />
        <span>Add your first product</span>
      </ButtonLink>
      <Link
        href="/"
        className="in i3 ob-later ob-enter focus-ring"
        aria-disabled={entering || undefined}
        onClick={(event) => {
          // Preserve new-tab links and instant keyboard/assistive-technology navigation.
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.detail === 0) return;
          if (!scene.current) return;
          event.preventDefault();
          void enter(scene.current);
        }}
      >
        <span>Go to my shop</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12h15m-6-6 6 6-6 6" />
        </svg>
      </Link>
    </OnboardingShell>
  );
}
