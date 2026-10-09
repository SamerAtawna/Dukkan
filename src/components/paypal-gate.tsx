"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useShop } from "@/lib/store";

/** Seller screens. Onboarding, the buyer's pay page, the demo agent and /unlock stay reachable. */
const SELLER = ["/add", "/orders", "/products", "/searches", "/settings"];
const isSellerPath = (p: string) => p === "/" || SELLER.some((s) => p === s || p.startsWith(`${s}/`));

/**
 * No PayPal account, no shop: a seller screen with no connected PayPal sends the seller into
 * onboarding, whose PayPal step cannot be skipped. Mounted once in the root layout.
 * Waits for the shop to load, and stays out of the way when the backend is not configured.
 */
export function PayPalGate() {
  const pathname = usePathname();
  const router = useRouter();
  const seller = isSellerPath(pathname);
  const loaded = useShop((s) => s.loaded);
  const offline = useShop((s) => s.offline);
  const connected = useShop((s) => Boolean(s.paypalEmail));
  const load = useShop((s) => s.load);

  useEffect(() => {
    if (seller) void load();
  }, [seller, load]);

  useEffect(() => {
    if (seller && loaded && !offline && !connected) router.replace("/onboarding/welcome");
  }, [seller, loaded, offline, connected, router]);

  return null;
}
