"use client";

import { cn } from "@/lib/cn";
import { useShop } from "@/lib/store";
import { Bot, Storefront, shadowAt } from "@/components/scene/storefront";

/**
 * Loading state for screens that wait on data: the home storefront in miniature, with an agent
 * beside it whose "…" bubble pulses. Purpose: state indication. It stays invisible for the first
 * 300ms (fast loads never flash it), then fades in; the pulse loops only while it is mounted,
 * i.e. only while the screen is loading. `page` centres it in the viewport for whole-screen waits.
 */
export function ShopLoader({ label, page }: { label: string; page?: boolean }) {
  const sign = useShop((s) => (s.loaded ? s.name : "dukkan"));
  return (
    <div className={cn("shop-loader", page && "page")} role="status" aria-live="polite">
      <div className="scene" aria-hidden="true">
        <div className="tiltX">
          <div className="stage3d">
            <div className="pedestal" />
            <div className="contact" />
            <span className="glow" />
            <Storefront open sign={sign} />
            <div className="agent a1" style={{ transform: "translate3d(-92px, 24px, 56px)" }}>
              <span className="agIn">
                <Bot say="think" />
              </span>
              <span className="agsh" style={shadowAt(19)} />
            </div>
          </div>
        </div>
      </div>
      <span className="mono text-lime-ink">{label}</span>
    </div>
  );
}
