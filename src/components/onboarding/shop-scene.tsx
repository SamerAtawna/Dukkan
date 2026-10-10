"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { cn } from "@/lib/cn";
import { Bot, Storefront, shadowAt } from "@/components/scene/storefront";
import { useSceneTilt } from "@/components/scene/use-scene-tilt";

type Props = {
  ref?: Ref<HTMLDivElement>;
  /** Text on the sign; the wordmark while the name field is empty. */
  sign?: string;
  /** Door notice; defaults to OPEN / CLOSED from the lights. */
  notice?: string;
  /** Delay in ms before the lights come on (welcome: 600, open: 400). Omit to keep the shop closed. */
  lightsAt?: number;
  /** Three bots arrive after the lights (Onboard3); timings live in onboarding.css under `.ob-3`. */
  agents?: boolean;
  /** A press on the scene that was not a drag. */
  onTap?: () => void;
};

/**
 * The hero storefront at the same size as on Home, hands-on:
 *   - drag turns the shop (bounded); it springs back on release
 *   - a tap bounces the sign and, on step 3, makes the bots hop
 * Lights are state: the scene starts `off` and switches on at `lightsAt`.
 */
export function ShopScene({ ref, sign, notice, lightsAt, agents = false, onTap }: Props) {
  const [lit, setLit] = useState(false);
  const [nudged, setNudged] = useState(false);
  const nudgeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (lightsAt === undefined) return;
    const t = window.setTimeout(() => setLit(true), lightsAt);
    return () => window.clearTimeout(t);
  }, [lightsAt]);

  useEffect(() => () => window.clearTimeout(nudgeTimer.current), []);

  function tap() {
    onTap?.();
    if (nudged) return;
    setNudged(true);
    nudgeTimer.current = window.setTimeout(() => setNudged(false), 700);
  }

  const tilt = useSceneTilt({ drag: true, onTap: tap });
  const open = lightsAt !== undefined && lit;

  return (
    <div
      ref={ref}
      className={cn("scene turn", !open && "off", tilt.turning && "grab", nudged && "nudge")}
      aria-hidden="true"
      {...tilt.sceneProps}
    >
      <div className={tilt.tiltClass} style={tilt.tiltStyle}>
        <div className={tilt.stageClass} style={tilt.stageStyle}>
          <div className="pedestal" />
          <div className="contact" />
          <span className="glow" />
          <Storefront open={open} sign={sign?.trim() || "dukkan"} notice={notice} />

          {agents && (
            <>
              <div className="agent a1" style={{ transform: "translate3d(-92px, 24px, 56px)" }}>
                <span className="agIn">
                  <Bot say="think" />
                </span>
                <span className="agsh" style={shadowAt(19)} />
              </div>
              <div className="agent a3" style={{ transform: "translate3d(92px, 28px, 70px)" }}>
                <span className="agIn">
                  <Bot small say="think" />
                </span>
                <span className="agsh" style={shadowAt(15)} />
              </div>
              <div className="orbit">
                <div className="orbitArm">
                  <span className="ctr">
                    <Bot />
                  </span>
                  <span className="agsh" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
