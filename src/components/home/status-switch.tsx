"use client";

import { cn } from "@/lib/cn";
import { useShop } from "@/lib/store";

/** "Open to AI agents" pill. A real switch: role="switch" + aria-checked, 44px tall. */
type Labels = { on: string; off: string };
const defaultLabels: Labels = { on: "Open to AI agents", off: "Closed to agents" };

export function StatusSwitch({ className, labels = defaultLabels }: { className?: string; labels?: Labels }) {
  const open = useShop((s) => s.open);
  const toggle = useShop((s) => s.toggleOpen);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={open}
      onClick={toggle}
      className={cn(
        "card thin press focus-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-full py-2 pl-2.5 pr-3 md:py-2.5 md:pl-3 md:pr-3.5",
        className
      )}
    >
      <span className={cn("dot", !open && "off")} />
      <span className={cn("mono st", open ? "on" : "off")} aria-live="polite">
        {open ? labels.on : labels.off}
      </span>
    </button>
  );
}
