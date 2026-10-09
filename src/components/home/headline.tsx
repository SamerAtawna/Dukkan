"use client";

import { cn } from "@/lib/cn";

/**
 * Hero headline. Words rise one by one (CSS keyframes, 40ms stagger).
 * The count (2 → 3) rolls with a transition so it can retarget mid-way. It is a numeral in
 * lime-ink: DESIGN.md reserves that colour for money and live status as text.
 */
type Props = { open: boolean; agents: 2 | 3 };

const h1Class =
  "hd m-0 font-medium tracking-[-0.02em] text-[1.625rem] leading-[1.2] md:text-[clamp(1.875rem,5vw,2.75rem)] md:leading-[1.15] [text-wrap:pretty]";

export function Headline({ open, agents }: Props) {
  if (!open) {
    return (
      <h1 className={h1Class} key="closed">
        <span className="w d1">Your</span> <span className="w d2">shop</span> <span className="w d3">is</span>{" "}
        <span className="w d4">closed</span> <span className="w d5">to</span> <span className="w d6">agents.</span>
      </h1>
    );
  }

  const three = agents === 3;
  return (
    <h1 className={h1Class} key="open">
      <span className="w d1 roll text-lime-ink tabular-nums">
        <span className={cn("num", three && "out")} aria-hidden={three}>
          2
        </span>
        <span className={cn("num", !three && "below")} aria-hidden={!three}>
          3
        </span>
      </span>{" "}
      <span className="w d2">AI</span> <span className="w d3">agents</span> <span className="w d4">are</span>{" "}
      <span className="w d5">inside</span> <span className="w d6">your</span> <span className="w d7">shop.</span>
    </h1>
  );
}
