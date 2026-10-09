"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { formatPrice, type Order } from "@/lib/types";
import { addressLines, selectOrder, stepOf, timeLabel, useOrders, whenLabel, type Carrier } from "@/lib/store-orders";
import { Button, ButtonLink } from "@/components/ui/button";
import { CheckIcon } from "@/components/icons";
import { PhoneHeader } from "@/components/nav/phone-header";
import { TopNav } from "@/components/nav/top-nav";
import { thumbFor, ThumbArtSvg, TruckIcon } from "@/components/orders/icons";
import { ShipSheet } from "@/components/orders/ship-sheet";

type Props = {
  id: string;
  /** `/orders/[id]/ship`: same screen with the tracking sheet open. */
  ship?: boolean;
  /** Force the progress line to redraw (demo: `?stepChanged=1`). */
  forceStepChanged?: boolean;
};

export function OrderScreen({ id, ship = false, forceStepChanged = false }: Props) {
  const order = useOrders(selectOrder(id));
  const loaded = useOrders((s) => s.loaded);
  const load = useOrders((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded && !order) return <div className="r-orders min-h-dvh bg-ground" />;

  if (!order) {
    return (
      <div className="r-orders flex min-h-dvh flex-col bg-ground text-text">
        <TopNav className="hidden md:flex" backHref="/orders" active="/orders" />
        <main className="col">
          <PhoneHeader title="Order not found" backHref="/orders" backLabel="Back to orders" />
          <p className="m-0 text-[0.9375rem] text-text-2">There is no order {id} in your shop.</p>
        </main>
      </div>
    );
  }

  // Keyed by id so a different order remounts and re-decides its progress animation.
  return <OrderBody key={id} id={id} order={order} ship={ship} forceStepChanged={forceStepChanged} />;
}

function OrderBody({ id, order, ship, forceStepChanged }: { id: string; order: Order; ship: boolean; forceStepChanged: boolean }) {
  const router = useRouter();
  const markSeen = useOrders((s) => s.markSeen);
  const markShipped = useOrders((s) => s.markShipped);
  const unship = useOrders((s) => s.unship);
  const rootRef = useRef<HTMLDivElement>(null);

  // The progress line draws itself only when the order advanced since the seller last looked.
  // Decided once on mount, so later store updates (shipping from this screen) do not replay it.
  const step = stepOf(order.status);
  const [animateProgress] = useState(() => forceStepChanged || useOrders.getState().seenStep[id] !== step);
  useEffect(() => {
    markSeen(id, step);
  }, [id, step, markSeen]);

  // Tracking sheet state (ship mode only). Mount closed, then open: the drawer slides up instead of appearing.
  const [sheet, setSheet] = useState(false);
  const dismissed = useRef(false);
  useEffect(() => {
    if (!ship) return;
    const t = setTimeout(() => setSheet(true), 60);
    return () => clearTimeout(t);
  }, [ship]);

  const pending = order.status === "pending";
  const shipped = order.status === "shipped" || order.status === "delivered";
  const stepLabel = order.status === "delivered" ? "Delivered" : shipped ? "Shipped" : "Ship it";
  const progressLabel = shipped ? "Order progress: all four steps done" : pending ? "Order progress: two of four steps done" : "Order progress: three of four steps done";
  const paidLine = pending ? "Cart built · not paid yet" : `Paid with PayPal · ${whenLabel(order.paidAt)}`;
  const thumb = thumbFor(order);
  const qty = order.items.reduce((s, i) => s + i.qty, 0);
  const itemsLine = `${qty} ${qty === 1 ? "item" : "items"}`;
  const rtl = order.lang !== "en";
  const address = addressLines(order);

  function doShip(carrier: Carrier, tracking: string) {
    dismissed.current = false;
    void markShipped(id, { carrier, tracking });
    setSheet(false);
    toast("Marked as shipped · buyer notified", {
      id: `ship-${id}`,
      duration: 6000,
      style: { background: "#10131A", color: "#EEF2FA", border: 0, borderRadius: 18, padding: "14px 8px 14px 18px" },
      classNames: { toast: "toast-ship", actionButton: "toast-ship-undo" },
      actionButtonStyle: { background: "transparent", border: "1px solid rgba(255,255,255,.2)", color: "#C8FF4D" },
      action: {
        label: "Undo",
        onClick: () => {
          void unship(id);
          setSheet(true);
        },
      },
    });
  }

  function onSheetOpenChange(open: boolean) {
    if (!open) dismissed.current = true;
    setSheet(open);
  }

  function onSheetComplete(open: boolean) {
    // Closed by the seller without shipping: back to the order.
    const current = useOrders.getState().orders.find((o) => o.id === id);
    if (!open && dismissed.current && current?.status === "paid") {
      router.replace(`/orders/${id}`);
    }
  }

  const cta = pending ? null : shipped ? (
    ship ? (
      <ButtonLink href="/" tone="lime" size="big" className="done-cta w-full md:w-auto">
        Done
      </ButtonLink>
    ) : null
  ) : ship ? (
    <Button tone="lime" size="big" className="w-full md:w-auto" onClick={() => setSheet(true)}>
      <TruckIcon />
      <span>Add tracking number</span>
    </Button>
  ) : (
    <ButtonLink href={`/orders/${id}/ship`} tone="lime" size="big" className="w-full md:w-auto">
      <TruckIcon />
      <span>Add tracking number</span>
    </ButtonLink>
  );

  return (
    <div ref={rootRef} className="r-orders flex min-h-dvh flex-col bg-ground text-text">
      <TopNav className="hidden md:flex" backHref="/orders" backLabel="Back to orders" active="/orders" />

      <main className={cn("col flex-1 gap-[18px] md:gap-6", !animateProgress && "settled", shipped && "shipped")}>
        <div className="md:hidden">
          <PhoneHeader
            title={`Order ${order.id}`}
            sub={paidLine}
            subClassName="mono text-lime-ink"
            backHref={ship ? `/orders/${id}` : "/"}
            backLabel={ship ? "Back to order" : "Back to home"}
          />
        </div>
        <div className="hidden flex-col gap-1.5 md:flex">
          <div className="mono text-lime-ink">{paidLine}</div>
          <h1 className="hd m-0 text-[2.125rem] font-medium leading-[1.15] tracking-[-0.02em]">Order {order.id}</h1>
        </div>

        <p
          className={cn(
            "rise m-0 text-[1.3125rem] font-medium leading-[1.7] [text-wrap:pretty] md:text-[1.625rem]",
            rtl ? "text-right" : "text-left"
          )}
          dir={rtl ? "rtl" : "ltr"}
          lang={order.lang}
        >
          {order.story}
        </p>

        <div
          className="card rise flex flex-wrap items-center gap-4 rounded-3xl px-[18px] py-4 md:gap-[22px] md:rounded-[28px] md:px-[26px] md:py-[22px]"
          style={{ animationDelay: ".1s" }}
        >
          <div className="thumb-3d" aria-hidden="true">
            <span className="md:hidden">
              <ThumbArtSvg art={thumb} size={42} />
            </span>
            <span className="hidden md:inline">
              <ThumbArtSvg art={thumb} size={60} />
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-[1_1_240px] md:gap-1.5">
            <div className="text-[0.9375rem] font-medium leading-[1.35] [text-wrap:pretty] md:hd md:text-lg md:leading-[1.3]">
              {order.items.map((i) => (i.qty > 1 ? `${i.qty} × ${i.title}` : i.title)).join(", ")}
            </div>
            <div className="mono">{itemsLine}</div>
          </div>
          <div className="hd amt amt-flash flex-none text-xl font-semibold tracking-[-0.02em] md:text-[1.875rem]">
            {formatPrice(order.amount, order.currency)}
          </div>
        </div>

        <div className="card steps-wrap flex flex-col gap-1 rounded-3xl px-4 pb-[18px] pt-[22px] md:rounded-[28px] md:px-7 md:pb-[26px] md:pt-[30px]">
          <div className="steps" aria-label={progressLabel}>
            <Step n={1} label="Found by agent" />
            <div className="seg s1" />
            <Step n={2} label="Cart built" />
            <div className="seg s2" />
            <Step n={3} label={pending ? "Waiting for payment" : "Paid"} />
            <div className="seg s3" />
            <div className="step">
              <div className="node now n4" aria-hidden="true">
                <span className="pip" />
                <span className="fill">
                  <CheckIcon size={16} className="md:hidden" />
                  <CheckIcon size={20} className="hidden md:block" />
                </span>
              </div>
              <div className="lbl l4" aria-live="polite">
                {stepLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))]">
          <div
            className="card rise flex flex-col gap-1.5 rounded-[22px] px-[18px] py-4 md:gap-2 md:rounded-3xl md:px-6 md:py-5"
            style={{ animationDelay: ".2s" }}
          >
            <div className="mono">Ship to</div>
            {address ? (
              <div className="text-[0.9375rem] leading-normal text-text md:text-base">
                {address.map((l, i) => (
                  <span key={i}>
                    {l}
                    {i < address.length - 1 && <br />}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[0.9375rem] leading-normal text-text-2 md:text-base">
                {pending ? "The address arrives with the PayPal payment." : "No shipping address came with the payment."}
              </div>
            )}
            {order.tracking && (
              <div className="mono pt-1">
                {order.carrier} · {order.tracking}
              </div>
            )}
          </div>
          <div
            className="card rise hidden flex-col gap-2 rounded-3xl px-6 py-5 md:flex"
            style={{ animationDelay: ".3s" }}
          >
            <div className="mono">Bought by</div>
            <div className="text-base leading-normal text-text">
              {order.agent ? `${order.agent}, on behalf of ${order.buyerName ?? "a buyer"}` : "An AI shopping agent, on behalf of a buyer"}
            </div>
            <div className="mono">
              Cart built {timeLabel(order.cartBuiltAt)}
              {order.paidAt && ` · Paid ${timeLabel(order.paidAt)}`}
              {order.shippedAt && ` · Shipped ${timeLabel(order.shippedAt)}`}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {cta && <div className="flex flex-wrap justify-end gap-3">{cta}</div>}
      </main>

      {ship && (
        <ShipSheet
          open={sheet}
          onOpenChange={onSheetOpenChange}
          onOpenChangeComplete={onSheetComplete}
          onShip={doShip}
          container={rootRef}
        />
      )}
    </div>
  );
}

function Step({ n, label }: { n: 1 | 2 | 3; label: string }) {
  return (
    <div className="step">
      <div className={`node n${n}`} aria-hidden="true">
        <CheckIcon size={16} className="md:hidden" />
        <CheckIcon size={20} className="hidden md:block" />
      </div>
      <div className={`lbl l${n}`}>{label}</div>
    </div>
  );
}
