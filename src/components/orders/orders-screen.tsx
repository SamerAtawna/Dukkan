"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import { cn } from "@/lib/cn";
import { formatPrice, type Order } from "@/lib/types";
import { selectOrders, useOrders, whenLabel } from "@/lib/store-orders";
import { ButtonLink } from "@/components/ui/button";
import { BackLink } from "@/components/nav/back-link";
import { TabBar } from "@/components/nav/tab-bar";
import { TopNav } from "@/components/nav/top-nav";
import { thumbFor, ThumbArtSvg, TruckIcon } from "@/components/orders/icons";

type Tab = 0 | 1 | 2;

const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** `/orders`: tabs with a sliding indicator; empty state when the filter (or the shop) has no orders. */
export function OrdersScreen() {
  const params = useSearchParams();
  const forceEmpty = params.get("empty") === "1";
  // Select the stored array (stable reference) and derive the filtered list here:
  // a selector that filters would return a new array every call and loop React's store hook.
  const stored = useOrders((s) => s.orders);
  const all = useMemo(() => selectOrders(stored), [stored]);
  const loaded = useOrders((s) => s.loaded);
  const load = useOrders((s) => s.load);
  const orders = forceEmpty ? [] : all;
  const [tab, setTab] = useState<Tab>(0);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    void load();
  }, [load]);

  const toShip = orders.filter((o) => o.status === "paid");
  const done = orders.filter((o) => o.status !== "paid");
  const rows = tab === 0 ? toShip : tab === 1 ? done : [...toShip, ...done];
  const noOrders = orders.length === 0;
  const showShipCta = (tab === 0 || tab === 2) && toShip.length > 0;

  const week = orders.filter((o) => o.paidAt && now - new Date(o.paidAt).getTime() < WEEK_MS);
  const weekTotal = week.reduce((s, o) => s + o.amount, 0);

  const tabs: { label: string }[] = [
    { label: noOrders ? "To ship" : `To ship · ${toShip.length}` },
    { label: "Shipped" },
    { label: "All" },
  ];

  return (
    <div className="r-orders flex min-h-dvh flex-col bg-ground text-text">
      <TopNav className="hidden md:flex" active="/orders" />

      <main className="col flex-1 gap-[18px] md:gap-6">
        <div className="flex items-center gap-3">
          <BackLink href="/" label="Back to home" />
          <div className="flex flex-col gap-0.5">
            <h1 className="hd m-0 text-xl font-medium tracking-[-0.01em] md:text-[1.75rem] md:tracking-[-0.02em]">Orders</h1>
            <div className="mono" aria-live="polite">
              {!loaded ? (
                "Loading…"
              ) : noOrders ? (
                "No orders yet"
              ) : (
                <>
                  This week · {week.length} {week.length === 1 ? "order" : "orders"} ·{" "}
                  <span className="text-lime-ink">{formatPrice(weekTotal)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <MotionConfig reducedMotion="user">
          <div className="tabs" role="tablist" aria-label="Order status">
            {tabs.map((t, i) => {
              const on = tab === i;
              return (
                <button
                  key={t.label}
                  className="tab"
                  role="tab"
                  type="button"
                  aria-selected={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setTab(i as Tab)}
                >
                  {on && (
                    <motion.span
                      className="ind"
                      layoutId="orders-tab-ind"
                      aria-hidden="true"
                      transition={{ duration: 0.25, ease: EASE_IN_OUT }}
                    />
                  )}
                  <span className="lbl-tab">{t.label}</span>
                </button>
              );
            })}
          </div>
        </MotionConfig>

        {!loaded ? null : rows.length === 0 ? (
          <EmptyPanel tab={tab} noOrders={noOrders} />
        ) : (
          <div key={tab} className="card list flex flex-col rounded-[22px] px-1.5 py-1" role="tabpanel">
            {rows.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </div>
        )}

        {showShipCta && (
          <div className="px-1 text-[0.8125rem] leading-normal text-text-2">
            {toShip.length === 1 ? "One order is" : `${toShip.length} orders are`} waiting for a tracking number. The buyer&apos;s agent is told the
            moment you add it.
          </div>
        )}

        <div className="flex-1" />

        {showShipCta && (
          <ButtonLink href={`/orders/${toShip[0].id}/ship`} tone="lime" size="big" className="w-full">
            <TruckIcon />
            <span>Ship order {toShip[0].id}</span>
          </ButtonLink>
        )}

        {loaded && noOrders && (
          <>
            <ButtonLink href="/searches" className="min-h-[52px] w-full">
              See what agents looked for
            </ButtonLink>
            <ButtonLink href="/add" className="ghost min-h-[52px] w-full">
              Add another product
            </ButtonLink>
          </>
        )}

        <TabBar className="md:hidden" />
      </main>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const tag =
    order.status === "paid" ? (
      <span className="tag warn">Ship it</span>
    ) : order.status === "shipped" ? (
      <span className="tag ok">Shipped</span>
    ) : (
      <span className="tag grey">Delivered</span>
    );
  const thumb = thumbFor(order);
  const rtl = order.lang !== "en";
  return (
    <Link className="row" href={`/orders/${order.id}`}>
      <div className={cn("thumb", thumb === "spoons" && "green")} aria-hidden="true">
        <ThumbArtSvg art={thumb} size={28} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="ar" dir={rtl ? "rtl" : "ltr"} lang={order.lang}>
          {order.summary}
        </div>
        <div className="flex items-center gap-2">
          {tag}
          <span className="mono">
            {order.id} · {whenLabel(order.paidAt)}
          </span>
        </div>
      </div>
      <div className="hd text-[0.9375rem] font-semibold tracking-[-0.01em] text-lime-ink">{formatPrice(order.amount, order.currency)}</div>
    </Link>
  );
}

function EmptyPanel({ tab, noOrders }: { tab: Tab; noOrders: boolean }) {
  const title = tab === 1 ? "Nothing shipped yet." : tab === 2 && !noOrders ? "No orders yet." : "Nothing to ship yet.";
  return (
    <div key={tab} className="card empty rounded-3xl" role="tabpanel">
      <div className="empty-scene" aria-hidden="true">
        <div className="empty-stage">
          <div className="empty-pedestal" />
          <div className="empty-spot" />
        </div>
      </div>
      <div className="hd text-lg font-medium leading-[1.3] tracking-[-0.01em] [text-wrap:pretty]">{title}</div>
      <div className="max-w-[260px] text-sm leading-[1.55] text-text-2">
        When an agent pays, the order lands here and you get a notification.
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <span className="dot" />
        <span className="mono text-lime-ink">Open to AI agents</span>
      </div>
    </div>
  );
}
