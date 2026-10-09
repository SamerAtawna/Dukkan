import type { ReactNode } from "react";
import { BackLink } from "@/components/nav/back-link";

type Props = {
  title: string;
  /** Mono line under the title (e.g. "Paid with PayPal · 09:42"). */
  sub?: ReactNode;
  subClassName?: string;
  backHref?: string;
  backLabel?: string;
  /** Right-aligned slot (a pill, a counter). */
  trailing?: ReactNode;
};

/** Phone sub-screen header: back arrow + 20px Unbounded title. Hidden on desktop by the caller. */
export function PhoneHeader({ title, sub, subClassName, backHref = "/", backLabel = "Back to home", trailing }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <BackLink href={backHref} label={backLabel} />
        <div className="flex flex-col gap-0.5">
          <h1 className="hd m-0 text-xl font-medium tracking-[-0.01em]">{title}</h1>
          {sub && <div className={subClassName ?? "mono"}>{sub}</div>}
        </div>
      </div>
      {trailing}
    </div>
  );
}
