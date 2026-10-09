"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Storefront } from "@/components/scene/storefront";
import { ProductArtwork } from "@/components/products/icons";
import type { Photo, ProductArt } from "@/lib/types";

export type PublishPhase = "saving" | "placed";

type Props = {
  phase: PublishPhase;
  shopName: string;
  title: string;
  photo: Photo | undefined;
  art: ProductArt;
  /** Fires once the "it's in your shop" beat has played (placed + ~1.7s). */
  onDone: () => void;
};

/** Timeline after the save lands, in ms. */
const LIGHTS_AT = 300;
const SIGN_AT = 450;
const DONE_AT = 1700;

/**
 * Publishing a product, the rare moment that earns a delight budget (seen a handful of times, ever).
 * Purpose: state indication. The listing card hovers over the closed shop while the save is in
 * flight, then travels in through the door; the lights come on, the sign pops, and the headline
 * says what happened. CSS keyframes for the one-shot beats, class transitions for the lights.
 */
export function PublishScene({ phase, shopName, title, photo, art, onDone }: Props) {
  const [lit, setLit] = useState(false);
  const [sign, setSign] = useState(false);

  useEffect(() => {
    if (phase !== "placed") return;
    const a = window.setTimeout(() => setLit(true), LIGHTS_AT);
    const b = window.setTimeout(() => setSign(true), SIGN_AT);
    const c = window.setTimeout(onDone, DONE_AT);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
      window.clearTimeout(c);
    };
  }, [phase, onDone]);

  const placed = phase === "placed";

  return (
    <div className={cn("pub", placed && "placed")} role="status" aria-live="polite">
      <div className="pub-body">
        <div className="pub-stage">
          <div className={cn("scene", !lit && "off", sign && "nudge")} aria-hidden="true">
            <div className="tiltX">
              <div className="stage3d">
                <div className="pedestal" />
                <div className="contact" />
                <span className="glow" />
                <Storefront open={lit} sign={shopName.trim() || "dukkan"} />
              </div>
            </div>
          </div>

          {/* The listing, as a little card: floats while saving, goes in through the door once saved. */}
          <div className={cn("pcard card", placed ? "in" : "float")} aria-hidden="true">
            <span className="pthumb">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- just-taken photo, a data URL
                <img src={photo.url} alt="" />
              ) : (
                <ProductArtwork art={art} size={28} />
              )}
            </span>
            <span className="ptitle">{title}</span>
          </div>
        </div>

        {placed ? (
          <div className="pub-copy">
            <h2 className="hd pub-h">
              <span className="w d1">It&apos;s</span> <span className="w d2">in</span> <span className="w d3">your</span>{" "}
              <span className="w d4">shop.</span>
            </h2>
            <div className="card thin pub-pill">
              <span className="dot" />
              <span className="mono text-lime-ink">Live · agents can find it now</span>
            </div>
          </div>
        ) : (
          <div className="pub-copy">
            <div className="flex items-center justify-center gap-2.5">
              <span className="dot livedot" />
              <span className="mono text-lime-ink">Putting it in your shop…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
