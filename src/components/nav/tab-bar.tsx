"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/cn";
import { HomeIcon, OrdersIcon, ProductsIcon, SettingsIcon } from "@/components/icons";

const tabs = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/products", label: "Products", Icon: ProductsIcon },
  { href: "/orders", label: "Orders", Icon: OrdersIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

/** Phone-only translucent bottom tab bar (top-level screens). */
export function TabBar(props: { className?: string }) {
  return (
    <Suspense fallback={<TabBarInner {...props} path="" />}>
      <TabBarLive {...props} />
    </Suspense>
  );
}

function TabBarLive(props: { className?: string }) {
  return <TabBarInner {...props} path={usePathname()} />;
}

function TabBarInner({ className, path }: { className?: string; path: string }) {
  return (
    <nav className={cn("tabbar", className)} aria-label="Main">
      {tabs.map(({ href, label, Icon }) => {
        const on = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} className={cn("tb", on && "on")} aria-current={on ? "page" : undefined}>
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
