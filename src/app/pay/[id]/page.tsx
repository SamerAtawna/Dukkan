"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { formatPrice, type OrderItem, type OrderStatus } from "@/lib/types";
import { CheckIcon } from "@/components/icons";
import { PayPalMark } from "@/components/onboarding/icons";
import "./pay.css";

/**
 * Buyer-facing checkout for one cart. This is the page an agent hands to the buyer:
 * the PayPal button (JS SDK v6) approves the order, then we capture it server-side.
 * Also the PayPal return URL for the redirect flow (?return=1&token=<paypal order id>).
 * `?demo=paid` replays the paid moment on a pending cart without paying (for the demo video).
 */

type Cart = {
  orderId: string;
  shop: string;
  status: OrderStatus;
  paypalOrderId: string | null;
  total: number;
  currency: string;
  items: OrderItem[];
  agent: string | null;
  buyerName: string | null;
};

type Stage = "loading" | "ready" | "paying" | "paid" | "cancelled" | "error" | "missing";

const SDK_SRC = process.env.NEXT_PUBLIC_PAYPAL_ENV === "live" ? "https://www.paypal.com/web-sdk/v6/core" : "https://www.sandbox.paypal.com/web-sdk/v6/core";

export default function PayPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-ground" />}>
      <PayScreen />
    </Suspense>
  );
}

function PayScreen() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const returned = params.get("return") === "1";
  const cancelled = params.get("cancel") === "1";
  const token = params.get("t") ?? "";
  const demoPaid = params.get("demo") === "paid";

  const [cart, setCart] = useState<Cart | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string | null>(null);
  const [paidName, setPaidName] = useState<string | null>(null);
  /** True only when the payment lands during this visit: the paid moment plays once, a reload stays still. */
  const [celebrate, setCelebrate] = useState(false);
  const session = useRef<PayPalOneTimeSession | null>(null);
  const [buttonReady, setButtonReady] = useState(false);

  const capture = useCallback(async () => {
    setStage("paying");
    const res = await fetch(`/api/checkout/${id}/capture?t=${encodeURIComponent(token)}`, { method: "POST" });
    const data = (await res.json()) as { order?: { buyerName: string | null }; error?: string; pending?: boolean };
    if (!res.ok || !data.order) {
      setError(data.error ?? "PayPal did not complete the payment");
      setStage("error");
      return;
    }
    setPaidName(data.order.buyerName);
    setCelebrate(true);
    setStage("paid");
  }, [id, token]);

  // Load the cart.
  useEffect(() => {
    let cancelledEffect = false;
    (async () => {
      const res = await fetch(`/api/checkout/${id}?t=${encodeURIComponent(token)}`);
      if (cancelledEffect) return;
      if (!res.ok) {
        setStage("missing");
        return;
      }
      const c = (await res.json()) as Cart;
      setCart(c);
      if (demoPaid && c.status === "pending") {
        setStage("ready");
        await new Promise((r) => setTimeout(r, 1200));
        if (cancelledEffect) return;
        setCelebrate(true);
        setStage("paid");
      } else if (c.status !== "pending") {
        setPaidName(c.buyerName);
        setStage("paid");
      } else if (returned && c.paypalOrderId) {
        void capture();
      } else if (cancelled) {
        setStage("cancelled");
      } else {
        setStage("ready");
      }
    })();
    return () => {
      cancelledEffect = true;
    };
  }, [id, token, returned, cancelled, capture, demoPaid]);

  // Load the PayPal SDK and create the payment session once the cart is ready.
  useEffect(() => {
    if (!cart || cart.status !== "pending" || demoPaid || (stage !== "ready" && stage !== "cancelled")) return;
    let disposed = false;
    (async () => {
      try {
        const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
        if (!clientId) throw new Error("PayPal is not configured (NEXT_PUBLIC_PAYPAL_CLIENT_ID)");
        await loadScript(SDK_SRC);
        if (disposed || !window.paypal) return;
        const sdk = await window.paypal.createInstance({ clientId, components: ["paypal-payments"], pageType: "checkout" });
        if (disposed) return;
        session.current = sdk.createPayPalOneTimePaymentSession({
          onApprove: () => capture(),
          onCancel: () => setStage("cancelled"),
          onError: (err) => {
            console.error("[paypal]", err);
            setError("PayPal could not open. Try again.");
            setStage("error");
          },
        });
        setButtonReady(true);
      } catch (err) {
        console.error("[paypal sdk]", err);
        if (disposed) return;
        setError(err instanceof Error && err.message.startsWith("PayPal is not configured") ? err.message : "Could not load PayPal");
        setStage("error");
      }
    })();
    return () => {
      disposed = true;
    };
    // The session is created once per cart; stage changes after that must not recreate it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.orderId, cart?.status]);

  async function pay() {
    if (!session.current || !cart?.paypalOrderId) return;
    setStage("paying");
    try {
      await session.current.start({ presentationMode: "auto" }, Promise.resolve({ orderId: cart.paypalOrderId }));
    } catch (err) {
      console.error("[paypal start]", err);
      setError("PayPal could not open. Try again.");
      setStage("error");
    }
  }

  const title =
    stage === "paid" ? "Paid. Thank you." : stage === "missing" ? "This cart does not exist." : cart ? `Pay ${cart.shop}` : "Loading your cart…";

  return (
    <div className="r-pay flex min-h-dvh flex-col bg-ground text-text">
      <main className={cn("col flex-1 items-stretch", celebrate && "won")}>
        <div className="flex items-center justify-between gap-3">
          <span className="hd text-base font-semibold tracking-[-0.01em]">Dukkan</span>
          <span className="card thin inline-flex min-h-9 items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3">
            <PayPalMark />
            <span className="mono">Sandbox checkout</span>
          </span>
        </div>

        <h1 key={stage === "paid" ? "paid" : "pay"} className="title hd m-0 text-[1.625rem] font-medium leading-[1.2] tracking-[-0.02em] md:text-[2.125rem]" aria-live="polite">
          {title}
        </h1>

        {cart && (
          <div className={cn("card rise flex flex-col rounded-[22px] px-1.5 py-1", stage === "paid" && "paid")}>
            {cart.items.map((it, i) => (
              <div key={it.productId} className={cn("flex items-center justify-between gap-3 px-3 py-3.5", i < cart.items.length - 1 && "bb")}>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[0.9375rem] font-medium leading-[1.3]">{it.title}</span>
                  <span className="mono">
                    {it.qty} × {formatPrice(it.unitPrice, cart.currency)}
                  </span>
                </div>
                <span className="amt text-[0.9375rem]">{formatPrice(it.unitPrice * it.qty, cart.currency)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-3.5">
              <span className="mono">Total</span>
              <span className="total hd amt text-xl font-semibold tracking-[-0.02em]">{formatPrice(cart.total, cart.currency)}</span>
            </div>
          </div>
        )}

        {cart?.agent && stage !== "paid" && (
          <p className="m-0 text-[0.9375rem] leading-normal text-text-2">
            Cart built by <span className="font-medium text-text">{cart.agent}</span>. You pay; the seller ships.
          </p>
        )}

        {stage === "paid" && (
          <div className="card rise flex items-center gap-3 rounded-3xl px-[18px] py-4" style={{ animationDelay: ".1s" }}>
            <span className="check" aria-hidden="true">
              <CheckIcon size={18} />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.9375rem] font-medium">Paid with PayPal{paidName ? ` · ${paidName}` : ""}</span>
              <span className="mono">
                Order {cart?.orderId} <span className="told">· the seller has been told</span>
              </span>
            </div>
          </div>
        )}

        {stage === "cancelled" && <p className="m-0 text-[0.9375rem] text-text-2">You left PayPal without paying. Nothing was charged.</p>}
        {stage === "error" && (
          <div className="q flex flex-col gap-1 px-[18px] py-4" role="alert">
            <div className="mono text-saffron-ink">Could not pay</div>
            <div className="text-[0.9375rem] leading-normal">{error}</div>
          </div>
        )}

        <div className="flex-1" />

        {cart && cart.status === "pending" && stage !== "paid" && (
          <div className="flex flex-col gap-2.5">
            <paypal-button
              type="pay"
              className={cn("paypal-gold", !buttonReady && "pending")}
              hidden={!buttonReady}
              aria-busy={stage === "paying"}
              onClick={pay}
            />
            {!buttonReady && stage !== "error" && (
              <div className="flex items-center gap-2.5" aria-live="polite">
                <span className="dot livedot" />
                <span className="mono text-lime-ink">Loading PayPal…</span>
              </div>
            )}
            {stage === "paying" && (
              <div className="flex items-center gap-2.5" aria-live="polite">
                <span className="dot livedot" />
                <span className="mono text-lime-ink">Waiting for PayPal…</span>
              </div>
            )}
            <p className="m-0 text-center text-[0.8125rem] leading-normal text-text-2">
              You approve the payment in PayPal. The money goes to the seller&apos;s PayPal account.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

const loaded = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  const existing = loaded.get(src);
  if (existing) return existing;
  const p = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
  loaded.set(src, p);
  return p;
}
