"use client";

import { toast } from "sonner";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import "./banner.css";

/**
 * Notification spec (Notification.dc.html). Three kinds; the OS draws the chrome for the two pushes,
 * so only the in-app banner is built here. Push copy, for the backend to send later:
 *
 *  1 · Push · order paid (the one notification that matters; amount in English, summary in the
 *      seller's language, one action — "Ship it" opens the tracking sheet directly):
 *      title  "Order paid · $35.00"
 *      body   "تم دفع الطلب ١٠٤٢ — مخدة مطرزة يدوياً. باقي عليكِ الشحن فقط."
 *      actions  Ship it → /orders/1042/ship   ·   See order → /orders/1042
 *
 *  2 · Push · agent found nothing (at most once a day, only when the same thing was asked for
 *      three or more times; on by default because it is the growth loop, off in Settings):
 *      title  "An agent wanted olive oil soap"
 *      body   "٧ وكلاء بحثوا عن صابون زيت الزيتون هذا الأسبوع. لو تصنعينه، أضيفيه."
 *      action   Add it → /add
 *
 *  3 · In app · while the seller is on Home: the banner below. Enters from the top in 400ms ease,
 *      leaves the same way, pauses while touched, swipe up to dismiss. Never shown on the Order
 *      screen it points to.
 */

export type InAppBannerProps = {
  /** Seller-language summary, e.g. "تم دفع الطلب ١٠٤٢ · ". */
  summary: string;
  summaryLang?: "ar" | "en";
  /** Money, shown in --lime-ink and kept LTR. */
  amount?: string;
  action: { label: string; href: string };
  onAction?: () => void;
  /** Play the standalone slide-in. Off when Sonner is animating the toast. */
  animate?: boolean;
  className?: string;
};

export function InAppBanner({ summary, summaryLang = "ar", amount, action, onAction, animate = true, className }: InAppBannerProps) {
  return (
    <div className={cn("r-banner card", animate && "banner", className)} role="status">
      <div className="appicon" aria-hidden="true">
        D
      </div>
      <div className="ar min-w-0 flex-1 text-sm" dir={summaryLang === "ar" ? "rtl" : "ltr"} lang={summaryLang}>
        {summary}
        {amount && (
          <span className="amt" dir="ltr">
            {amount}
          </span>
        )}
      </div>
      <ButtonLink href={action.href} onClick={onAction} className="min-h-9 px-3 text-[0.8125rem]">
        {action.label}
      </ButtonLink>
    </div>
  );
}

export type OrderPaidBannerInput = {
  orderId: string;
  amount: string;
  /** Seller-language summary; defaults to the Arabic "order paid" line with Arabic-Indic digits. */
  summary?: string;
  summaryLang?: "ar" | "en";
  /** Milliseconds before it leaves on its own. Default 6000. */
  duration?: number;
};

const arabicDigits = (n: string) => n.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

/**
 * Shows the "order paid" in-app banner at the top of the screen via Sonner.
 * Returns the toast id, or null when suppressed because the seller is already on that order.
 */
export function showOrderPaidBanner({ orderId, amount, summary, summaryLang = "ar", duration = 6000 }: OrderPaidBannerInput) {
  const href = `/orders/${orderId}`;
  if (typeof window !== "undefined" && window.location.pathname.startsWith(href)) return null;

  const text = summary ?? `تم دفع الطلب ${arabicDigits(orderId)} · `;
  const id = `order-paid-${orderId}`;

  toast.custom(
    (t) => (
      <InAppBanner
        summary={text}
        summaryLang={summaryLang}
        amount={amount}
        action={{ label: "Ship it", href }}
        onAction={() => toast.dismiss(t)}
        animate={false}
      />
    ),
    { id, position: "top-center", duration, unstyled: true }
  );
  return id;
}
