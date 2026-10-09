"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/cn";
import { StatusSwitch } from "@/components/home/status-switch";
import { BackLink } from "@/components/nav/back-link";

const links = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/orders", label: "Orders" },
  { href: "/searches", label: "Searches" },
  { href: "/settings", label: "Settings" },
];

type Props = {
  className?: string;
  /** Sub-screens show a round back button before the wordmark (Desktop*.dc.html). */
  backHref?: string;
  backLabel?: string;
  /** Which link is highlighted; defaults to the current path. */
  active?: string;
  /** Override the status pill copy (e.g. "Open · nothing to sell yet"). */
  statusLabels?: { on: string; off: string };
};

/** Desktop top bar: optional back button, wordmark, link row, shop status switch. */
export function TopNav(props: Props) {
  // usePathname needs a Suspense boundary on dynamic routes under cacheComponents.
  return (
    <Suspense fallback={<TopNavInner {...props} current={props.active ?? ""} />}>
      <TopNavLive {...props} />
    </Suspense>
  );
}

function TopNavLive(props: Props) {
  const path = usePathname();
  return <TopNavInner {...props} current={props.active ?? path} />;
}

function TopNavInner({ className, backHref, backLabel, current, statusLabels }: Props & { current: string }) {
  return (
    <nav className={cn("nav", backHref && "has-back", className)} aria-label="Shop">
      <div className="flex items-center gap-3.5">
        {backHref && <BackLink href={backHref} label={backLabel ?? "Back to home"} className="!h-12 !w-12" />}
        <Link href="/" className="hd text-lg font-semibold tracking-[-0.01em]">
          Dukkan
        </Link>
      </div>
      <div className="navlinks">
        {links.map(({ href, label }) => {
          const on = href === "/" ? current === "/" : current.startsWith(href);
          return (
            <Link key={href} href={href} className={cn("nl", on && "on")} aria-current={on ? "page" : undefined}>
              {label}
            </Link>
          );
        })}
      </div>
      <StatusSwitch labels={statusLabels} />
    </nav>
  );
}
