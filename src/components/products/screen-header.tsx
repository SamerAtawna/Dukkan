import type { ReactNode } from "react";
import { BackLink } from "@/components/nav/back-link";

type Props = {
  title: string;
  sub?: ReactNode;
  backHref: string;
  backLabel: string;
  trailing?: ReactNode;
};

/**
 * Header row shared by both products screens: back circle, title + mono line, trailing slot.
 * Phone: 20px title (Products.dc.html). Desktop: 28px title inside the column (DesktopProducts.dc.html).
 */
export function ScreenHeader({ title, sub, backHref, backLabel, trailing }: Props) {
  return (
    <div className="flex items-center gap-3">
      <BackLink href={backHref} label={backLabel} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="hd m-0 text-xl font-medium tracking-[-0.01em] md:text-[1.75rem] md:tracking-[-0.02em]">{title}</h1>
        {sub && <div className="mono">{sub}</div>}
      </div>
      {trailing}
    </div>
  );
}
