"use client";

import "../onboarding.css";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { OnboardingShell } from "@/components/onboarding/shell";
import { ChevronLeftIcon, PayPalMark } from "@/components/onboarding/icons";
import { cn } from "@/lib/cn";
import { useShop } from "@/lib/store";

type Stage = "idle" | "busy" | "done";

/** Back from PayPal: hold the shimmer this long before the card flips, so the flip reads as the result. */
const RETURN_BEAT_MS = 700;

const RETURN_ERRORS: Record<string, string> = {
  cancelled: "You left PayPal before connecting. Nothing changed.",
  error: "PayPal could not connect that account. Try again.",
};

/**
 * Step 2: connect PayPal. idle → busy (label cross-fade, spinner, card shimmers) → done (card flips
 * to its PayPal-navy back, lifts, sheen, check pings). The card is dealt onto the table on entry.
 * Behind it: Log in with PayPal. The button opens PayPal's own sign-in (/api/paypal/login); PayPal
 * returns to /api/paypal/callback, which saves the account and lands here with ?paypal=connected,
 * where the card is still shimmering and then flips. Orders then pay the connected account.
 */
export default function PaypalPage() {
  return (
    <Suspense fallback={null}>
      <PaypalStep />
    </Suspense>
  );
}

function PaypalStep() {
  const router = useRouter();
  const search = useSearchParams();
  const returned = search.get("paypal");
  // Why the callback failed (PayPal's own error text), kept in state because the query is dropped below.
  const [reason] = useState(() => search.get("reason"));
  const paypalEmail = useShop((s) => s.paypalEmail);
  const loaded = useShop((s) => s.loaded);
  const load = useShop((s) => s.load);
  const [localStage, setStage] = useState<Stage>(() => (returned === "connected" ? "busy" : "idle"));
  const [error, setError] = useState<string | null>(() => (returned ? (RETURN_ERRORS[returned] ?? null) : null));
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  // Back from PayPal: once the saved account is in, flip the card and drop the query (no replay on refresh).
  useEffect(() => {
    if (!returned || (returned === "connected" && !(loaded && paypalEmail))) return;
    const t = setTimeout(
      () => {
        if (returned === "connected") setStage("done");
        router.replace("/onboarding/paypal", { scroll: false });
      },
      returned === "connected" ? RETURN_BEAT_MS : 0
    );
    return () => clearTimeout(t);
  }, [returned, loaded, paypalEmail, router]);

  // Already connected on an earlier visit: the card sits on its "done" face from the start.
  const stage: Stage = loaded && paypalEmail && localStage !== "busy" ? "done" : localStage;
  const on = stage === "done";
  const busy = stage === "busy";
  // The card and the button wait for the shop, so a connected account is never dealt as "Not
  // connected" and then flipped. Connected before this visit = `settled`: dealt onto its back face
  // with no flip, lift, sheen or ping; those celebrate a connection made here, not one found.
  const [cold] = useState(() => !useShop.getState().loaded);
  const settled = on && localStage === "idle";

  /** To PayPal's sign-in page. The card shimmers while the browser leaves. */
  function connect() {
    if (busy || on) return;
    setStage("busy");
    setError(null);
    // A full navigation on purpose: the route redirects off-site to PayPal, which router.push cannot follow.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/api/paypal/login");
  }

  /** Back to "Not connected": the card flips to its front again. Useful when re-recording the demo. */
  async function disconnect() {
    if (disconnecting) return;
    setDisconnecting(true);
    try {
      await useShop.getState().save({ paypalEmail: null });
      setStage("idle");
    } finally {
      setDisconnecting(false);
    }
  }

  const back = (
    <Link href="/onboarding/welcome" className="icon" aria-label="Back">
      <ChevronLeftIcon />
    </Link>
  );

  return (
    <OnboardingShell step={2} phoneLead={back} desktopLead={back}>
      <h1 className="hd ob-h1">
        <span className="w d1">Get</span> <span className="w d2">paid</span> <span className="w d3">with</span>{" "}
        <span className="w d4">PayPal.</span>
      </h1>
      <p className="in i1 m-0 text-[0.9375rem] leading-normal text-text-2">
        Agents pay through PayPal. The money goes straight to your PayPal account — nothing else to set up.
      </p>

      <div className="stage" aria-live="polite">
        <div className={cn("lift", on && "on", !loaded && "wait", cold && "late", settled && "settled")}>
          <span className="ground" aria-hidden="true" />
          <div className={cn("flip", on && "on", busy && "busy")}>
            <div className="side frontS" aria-hidden={on}>
              <div className="relative flex items-center justify-between">
                <span className="pp">
                  <PayPalMark />
                  <span>
                    Pay<b>Pal</b>
                  </span>
                </span>
                <span className="mono">Payments</span>
              </div>
              <div className="dots" aria-hidden="true">
                •••• •••• ••••
              </div>
              <div className="relative flex flex-col gap-1">
                <div className="hd text-lg font-medium tracking-[-0.01em]">Not connected</div>
                <div className="text-[0.8125rem] text-text-2">Takes about a minute</div>
              </div>
              <span className="sheen" aria-hidden="true" />
            </div>
            <div className="side backS" aria-hidden={!on}>
              <div className="c1 relative flex items-center justify-between">
                <span className="pp">
                  <PayPalMark />
                  <span>
                    Pay<b>Pal</b>
                  </span>
                </span>
                <span className="check" aria-hidden="true">
                  <CheckIcon size={20} />
                </span>
              </div>
              <div className="relative flex flex-col gap-1">
                <div className="hd c2 text-lg font-medium tracking-[-0.01em] text-lime">Connected</div>
                <div className="mono c3 normal-case tracking-normal text-[#93A0B8]">{paypalEmail ?? "sandbox"}</div>
              </div>
              <span className="sheen" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="q flex flex-col gap-1 px-[18px] py-3.5" role="alert">
          <div className="mono text-saffron-ink">Could not connect</div>
          <div className="text-[0.875rem] leading-normal">{error}</div>
          {reason && <div className="mono text-[0.75rem] leading-normal break-words text-text-2">{reason}</div>}
        </div>
      )}

      <div className="flex-1" />

      {!loaded ? (
        <div className="min-h-14" aria-hidden="true" />
      ) : !on ? (
        <Button
          tone="lime"
          size="big"
          className={cn("relative w-full", busy && "busy", cold && "fade")}
          onClick={connect}
          aria-busy={busy}
          aria-disabled={busy}
        >
          <span className="lbl idleL">Connect PayPal</span>
          <span className="lbl busyL" aria-hidden={!busy}>
            <span className="spin" aria-hidden="true" />
            <span>{returned === "connected" ? "Connecting…" : "Opening PayPal…"}</span>
          </span>
          <span className="invisible">Opening PayPal…</span>
        </Button>
      ) : (
        <ButtonLink href="/onboarding/open" tone="lime" size="big" className="fade w-full">
          <span>Continue</span>
          <ArrowRightIcon size={18} strokeWidth={2.4} />
        </ButtonLink>
      )}
      {!loaded ? (
        <span className="ob-later later invisible" aria-hidden="true">
          Do this later
        </span>
      ) : on ? (
        <button type="button" className="ob-later later fade cursor-pointer border-0 bg-transparent font-body" onClick={() => void disconnect()} disabled={disconnecting}>
          {disconnecting ? "Disconnecting…" : "Disconnect PayPal"}
        </button>
      ) : (
        // No "Do this later": a shop cannot sell without PayPal (PayPalGate sends sellers back here).
        <span className="ob-later later invisible" aria-hidden="true">
          Do this later
        </span>
      )}
    </OnboardingShell>
  );
}
