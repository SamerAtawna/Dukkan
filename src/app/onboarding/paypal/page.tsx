"use client";

import "../onboarding.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { OnboardingShell } from "@/components/onboarding/shell";
import { ChevronLeftIcon, PayPalMark } from "@/components/onboarding/icons";
import { cn } from "@/lib/cn";
import { api, ApiError } from "@/lib/api";
import { useShop } from "@/lib/store";

type Stage = "idle" | "busy" | "done";

/** The card flip is 1.4s in the design; the real call usually returns sooner, so we hold the beat. */
const MIN_BUSY_MS = 1400;

/**
 * Step 2: connect PayPal. idle → busy (label cross-fade, spinner, card shimmers) → done (card flips
 * to its PayPal-navy back, lifts, sheen, check pings). The card is dealt onto the table on entry.
 * Behind it: POST /api/paypal/connect, a real sandbox OAuth call that records the account on the shop.
 */
export default function PaypalPage() {
  const paypalEmail = useShop((s) => s.paypalEmail);
  const loaded = useShop((s) => s.loaded);
  const load = useShop((s) => s.load);
  const [localStage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  // Already connected on an earlier visit: the card sits on its "done" face from the start.
  const stage: Stage = loaded && paypalEmail && localStage !== "busy" ? "done" : localStage;
  const on = stage === "done";
  const busy = stage === "busy";
  // The card and the button wait for the shop, so a connected account is never dealt as "Not
  // connected" and then flipped. Connected before this visit = `settled`: dealt onto its back face
  // with no flip, lift, sheen or ping; those celebrate a connection made here, not one found.
  const [cold] = useState(() => !useShop.getState().loaded);
  const settled = on && localStage === "idle";

  async function connect() {
    if (busy || on) return;
    setStage("busy");
    setError(null);
    const started = Date.now();
    try {
      const res = await api.post<{ connected: boolean; email: string | null }>("/api/paypal/connect", {});
      await new Promise((r) => setTimeout(r, Math.max(0, MIN_BUSY_MS - (Date.now() - started))));
      useShop.setState({ paypalEmail: res.email, onboarded: true });
      setStage("done");
    } catch (err) {
      setStage("idle");
      setError(
        err instanceof ApiError && err.notConfigured
          ? "PayPal keys are missing. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.local."
          : "PayPal did not accept the sandbox credentials. Check .env.local and try again."
      );
    }
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
            <span>Opening PayPal…</span>
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
        <Link href="/onboarding/open" className={cn("ob-later later", cold && "fade")}>
          Do this later
        </Link>
      )}
    </OnboardingShell>
  );
}
