"use client";

import Link from "next/link";
import { useState, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { useShop } from "@/lib/store";
import { CommandBar } from "@/components/home/command-bar";
import { ButtonLink } from "@/components/ui/button";
import { MicIcon } from "@/components/icons";
import { TabBar } from "@/components/nav/tab-bar";
import { TopNav } from "@/components/nav/top-nav";
import "./home-empty.css";

const steps = [
  { title: "Take a photo, say what it is", meta: "About a minute" },
  { title: "AI writes the listing, you approve it", meta: "You can change any line" },
  { title: "Agents find it and pay with PayPal", meta: "You only ship" },
];

/**
 * First-run home: the shop is open but empty. Same 3D scene as the hero, without agents,
 * orbit or coin (HomeEmpty.dc.html). Renders the whole page body for `/` when there are no products.
 */
export function HomeEmpty() {
  const name = useShop((s) => s.name);
  const open = useShop((s) => s.open);
  const toggle = useShop((s) => s.toggleOpen);

  return (
    <div className="r-home-empty flex min-h-dvh flex-col bg-ground text-text">
      <TopNav className="hidden md:flex" statusLabels={{ on: "Open · nothing to sell yet", off: "Closed to agents" }} />

      <main className="col">
        <div className="flex items-center justify-between gap-3 md:hidden">
          <Link href="/settings" className="hd inline-flex min-h-11 items-center text-[0.9375rem] font-semibold tracking-[-0.01em]">
            {name}
          </Link>
          <button
            type="button"
            role="switch"
            aria-checked={open}
            onClick={toggle}
            className="card thin press focus-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-full py-2 pl-2.5 pr-3"
          >
            <span className={cn("dot", !open && "off")} />
            <span className={cn("mono st", open ? "on" : "off")} aria-live="polite">
              {open ? "Open · nothing to sell yet" : "Closed to agents"}
            </span>
          </button>
        </div>

        <EmptyScene open={open} />

        {open ? (
          <h1 className={h1Class} key="open">
            <span className="w d1">Your</span> <span className="w d2">shop</span> <span className="w d3">is</span>{" "}
            <span className="w d4">open,</span> <span className="w d5">but</span> <span className="w d6">empty.</span>
          </h1>
        ) : (
          <h1 className={h1Class} key="closed">
            <span className="w d1">Your</span> <span className="w d2">shop</span> <span className="w d3">is</span>{" "}
            <span className="w d4">closed</span> <span className="w d5">to</span> <span className="w d6">agents.</span>
          </h1>
        )}

        <p className="m-0 text-[0.9375rem] leading-normal text-text-2 md:text-lg">
          Add one product and agents can start finding you — usually within minutes.
        </p>

        <CommandBar />

        <div className="flex flex-wrap gap-2 md:gap-2.5">
          <ButtonLink href="/add" className="px-3.5 text-[0.8125rem] md:px-[18px] md:text-sm">
            Add a product
          </ButtonLink>
          <ButtonLink href="/onboarding/welcome" className="px-3.5 text-[0.8125rem] md:px-[18px] md:text-sm">
            How it works
          </ButtonLink>
        </div>

        <div className="mt-1 flex flex-col gap-2 md:mt-2 md:gap-2.5">
          <div className="mono">What happens next</div>
          <div className="card flex flex-col rounded-[22px] px-2 py-1.5 md:rounded-3xl">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className={cn(
                  "flex items-center gap-3 px-2 py-3 md:gap-3.5 md:px-3.5 md:py-4",
                  i < steps.length - 1 && "bb",
                  i === 0 && "ev1"
                )}
              >
                <span className={cn("stepn", i === 0 && "now")}>{i + 1}</span>
                <div className="flex min-w-0 flex-col gap-0.5 md:gap-[3px]">
                  <div className="text-sm font-medium md:text-base">{s.title}</div>
                  <div className="mono">{s.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ButtonLink href="/add" tone="lime" size="big" className="w-full px-[18px] md:w-auto md:self-start md:px-7">
          <MicIcon size={20} />
          <span>Add your first product</span>
        </ButtonLink>

        <TabBar className="md:hidden" />
      </main>
    </div>
  );
}

const h1Class =
  "hd m-0 font-medium tracking-[-0.02em] text-[1.625rem] leading-[1.2] md:text-[clamp(1.875rem,5vw,2.75rem)] md:leading-[1.15] [text-wrap:pretty]";

/** The hero scene with the shop only: no agents, no orbit, no coin. Uses the global .scene geometry. */
function EmptyScene({ open }: { open: boolean }) {
  const [hx, setHx] = useState(0);
  const [vy, setVy] = useState(0);

  function tilt(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(-2, Math.min(2, Math.round(((e.clientX - r.left) / r.width - 0.5) * 4)));
    const ny = Math.max(-1, Math.min(1, Math.round(((e.clientY - r.top) / r.height - 0.5) * 2)));
    if (nx !== hx) setHx(nx);
    if (ny !== vy) setVy(ny);
  }

  return (
    <div
      className={cn("scene", !open && "off")}
      aria-hidden="true"
      onPointerMove={tilt}
      onPointerLeave={() => {
        setHx(0);
        setVy(0);
      }}
    >
      <div className={cn("tiltX", `vy${vy}`)}>
        <div className={cn("stage3d", `hx${hx}`)}>
          <div className="pedestal" />
          <div className="contact" />
          <span className="glow" />
          <div className="shop">
            <div className="face top" />
            <div className="face right" />
            <div className="face front">
              <span className="awning" />
              <span className="door" />
              <span className="baseline" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
