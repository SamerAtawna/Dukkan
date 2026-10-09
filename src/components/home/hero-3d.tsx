"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Bot, Storefront, shadowAt } from "@/components/scene/storefront";
import { useSceneTilt } from "@/components/scene/use-scene-tilt";

/**
 * A miniature storefront built with CSS 3D. All geometry lives in globals.css under
 * `.scene`; this component only owns the state classes:
 *   - `off`   -> shop closed: lights out, agents lift away, orbit fades
 *   - `hid`   -> third agent not yet arrived
 *   - `drop`  -> coin falls when the third agent pays
 *   - `hx*`/`vy*` -> quantised pointer tilt (desktop, fine pointer only)
 *   - `turn`/`grab` -> drag turns the shop within bounds, springs back on release
 * The lights come on at 0.6s, once the shop has landed on the pedestal (one-shot, first paint only).
 * Agents are small lime "bots" (body, two eyes, antenna) with a speech bubble: three dots
 * while browsing, a lime check once paid. Every bot motion is one-shot: nothing loops on Home.
 */
type Props = {
  open: boolean;
  /** When true the third agent has settled and the coin drops. */
  third: boolean;
  className?: string;
};

const LIGHTS_AT_MS = 600;

export function Hero3D({ open, third, className }: Props) {
  const [lit, setLit] = useState(false);
  const tilt = useSceneTilt({ drag: true });

  useEffect(() => {
    const t = window.setTimeout(() => setLit(true), LIGHTS_AT_MS);
    return () => window.clearTimeout(t);
  }, []);

  const on = open && lit;

  return (
    <div
      className={cn("scene turn", !on && "off", tilt.turning && "grab", className)}
      aria-hidden="true"
      {...tilt.sceneProps}
    >
      <div className={tilt.tiltClass} style={tilt.tiltStyle}>
        <div className={tilt.stageClass} style={tilt.stageStyle}>
          <div className="pedestal" />
          <div className="contact" />
          <span className="glow" />
          <Storefront open={on} />

          {/* Agent 1: walks in from the left and browses the window (dots bubble). */}
          <div className="agent a1" style={{ transform: "translate3d(-92px, 24px, 56px)" }}>
            <span className="agIn">
              <Bot say="think" />
            </span>
            <span className="agsh" style={shadowAt(19)} />
          </div>

          {/* Agent 3: arrives at 2.2s at the door and pays (check bubble + coin). */}
          <div className={cn("agent a3", !third && "hid")} style={{ transform: "translate3d(92px, 28px, 70px)" }}>
            <span className="agIn">
              <Bot small say="paid" />
            </span>
            <span className="agsh" style={shadowAt(15)} />
          </div>

          {/* Agent 2: comes around the right side of the shop and settles by the side window. */}
          <div className="orbit">
            <div className="orbitArm">
              <span className="ctr">
                <Bot />
              </span>
              <span className="agsh" />
            </div>
          </div>

          <span className={cn("coin", third && "drop")} />
        </div>
      </div>
    </div>
  );
}
