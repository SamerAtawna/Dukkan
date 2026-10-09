"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/nav/top-nav";
import { TabBar } from "@/components/nav/tab-bar";
import { BackLink } from "@/components/nav/back-link";
import { Button, ButtonLink } from "@/components/ui/button";
import { SwitchRow } from "@/components/settings/switch-row";
import { LanguagePicker } from "@/components/settings/language-picker";
import { useShop } from "@/lib/store";
import "./settings.css";

/** The shop name, saved on blur or Enter. Re-keyed by the saved name so a fresh load resets the draft. */
function NameField({ name, onCommit }: { name: string; onCommit: (name: string) => void }) {
  const [draft, setDraft] = useState(name);
  function commit() {
    const next = draft.trim();
    if (next && next !== name) onCommit(next);
    else setDraft(name);
  }
  return (
    <input
      className="field"
      id="shop"
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      autoComplete="organization"
    />
  );
}

export default function SettingsPage() {
  const shopName = useShop((s) => s.name);
  const open = useShop((s) => s.open);
  const toggleOpen = useShop((s) => s.toggleOpen);
  const setName = useShop((s) => s.setName);
  const load = useShop((s) => s.load);
  const loaded = useShop((s) => s.loaded);
  const paypalEmail = useShop((s) => s.paypalEmail);
  const notifyPaid = useShop((s) => s.notifyPaid);
  const notifyNoMatch = useShop((s) => s.notifyNoMatch);
  const notifyWeekly = useShop((s) => s.notifyWeekly);
  const toggle = useShop((s) => s.toggleNotify);

  useEffect(() => {
    void load();
  }, [load]);


  return (
    <div className="r-settings flex min-h-dvh flex-col bg-ground text-text">
      <TopNav className="hidden md:flex" />

      {/* Children order matters: header is :nth-child(1); the four sections stagger as 2–5. */}
      <main className="col flex-1 gap-3.5 md:gap-6 md:pt-8" key={loaded ? "loaded" : "loading"}>
        <div className="mb-1 flex items-center gap-3">
          <BackLink href="/" label="Back to home" />
          <h1 className="hd m-0 text-xl font-medium tracking-[-0.01em] md:text-[1.75rem] md:tracking-[-0.02em]">Settings</h1>
        </div>

        <section className="card sec">
          <div className="mono">Shop</div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="shop" className="font-body text-[0.8125rem] text-text-2">
              Name
            </label>
            <NameField key={shopName} name={shopName} onCommit={setName} />
          </div>
          <SwitchRow
            className="border-0 pb-0"
            label="Open to AI agents"
            hint={open ? "Agents can find and buy from you" : "Listed, but agents cannot buy"}
            checked={open}
            onChange={toggleOpen}
            ariaLabel="Open to AI agents"
          />
        </section>

        <section className="card sec">
          <div className="mono">Your language</div>
          <LanguagePicker />
          <div className="text-[0.8125rem] leading-normal text-text-2">
            You record and read summaries in this language. Listings stay in English for the agents.
          </div>
        </section>

        <section className="card sec">
          <div className="flex items-center justify-between gap-2">
            <div className="mono">Payments</div>
            {paypalEmail ? <span className="tag ok">PayPal connected</span> : <span className="tag warn">Not connected</span>}
          </div>
          <div className="row">
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="text-[0.9375rem] font-medium">PayPal account</div>
              <div className="mono normal-case tracking-normal">{paypalEmail ?? "Connect to get paid"}</div>
            </div>
            <ButtonLink href="/onboarding/paypal" className="px-3.5 text-[0.8125rem]">
              {paypalEmail ? "Change" : "Connect"}
            </ButtonLink>
          </div>
          <div className="text-[0.8125rem] leading-normal text-text-2">
            Agents pay with PayPal. Money lands in your PayPal account. Dukkan takes no fee in this preview.
          </div>
        </section>

        <section className="card sec">
          <div className="mono">Tell me when</div>
          <SwitchRow label="An order is paid" checked={notifyPaid} onChange={() => toggle("notifyPaid")} ariaLabel="Notify when an order is paid" />
          <SwitchRow
            label="An agent wanted something I don't sell"
            checked={notifyNoMatch}
            onChange={() => toggle("notifyNoMatch")}
            ariaLabel="Notify when an agent search had no match"
          />
          <SwitchRow label="Weekly summary" checked={notifyWeekly} onChange={() => toggle("notifyWeekly")} ariaLabel="Weekly summary" />
        </section>

        <div className="flex-1" />
        <Button className="self-center border-0 bg-transparent px-3.5 text-[0.8125rem] text-saffron-ink shadow-none">
          Close my shop for good
        </Button>

        <TabBar className="md:hidden" />
      </main>
    </div>
  );
}
