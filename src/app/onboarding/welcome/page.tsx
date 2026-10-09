"use client";

import "../onboarding.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { OnboardingShell } from "@/components/onboarding/shell";
import { ShopScene } from "@/components/onboarding/shop-scene";
import { sellerLanguages, useOnboarding } from "@/lib/onboarding-store";

/** Step 1: shop name + the language the seller records in. Saved to the shop on Continue. */
export default function WelcomePage() {
  const router = useRouter();
  const shopName = useOnboarding((s) => s.shopName);
  const lang = useOnboarding((s) => s.lang);
  const setShopName = useOnboarding((s) => s.setShopName);
  const setLang = useOnboarding((s) => s.setLang);
  const hydrate = useOnboarding((s) => s.hydrate);
  const commit = useOnboarding((s) => s.commit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  async function next() {
    if (saving) return;
    setSaving(true);
    await commit();
    router.push("/onboarding/paypal");
  }

  return (
    <OnboardingShell step={1} phoneLead={<div className="hd text-base font-semibold tracking-[-0.01em]">Dukkan</div>}>
      {/* The sign shows the name as it is typed; the lights come on at 0.6s as on Home; a tap on the shop jumps to the name field. */}
      <ShopScene sign={shopName} notice="SOON" lightsAt={600} onTap={() => document.getElementById("shop")?.focus()} />

      <h1 className="hd ob-h1">
        <span className="w d1">A</span> <span className="w d2">shop</span> <span className="w d3">that</span>{" "}
        <span className="w d4">AI</span> <span className="w d5">agents</span> <span className="w d6">buy</span>{" "}
        <span className="w d7">from.</span>
      </h1>
      <p className="in i1 m-0 text-[0.9375rem] leading-normal text-text-2">
        You add products by talking. Agents find them, pay with PayPal, and you ship. Two questions to start.
      </p>

      <div className="in i2 flex flex-col gap-2">
        <label className="mono" htmlFor="shop">
          Your shop&apos;s name
        </label>
        <input
          className="field"
          id="shop"
          type="text"
          placeholder="e.g. Salma Crafts"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void next()}
          autoComplete="organization"
        />
      </div>

      <div className="in i3 flex flex-col gap-2">
        <div className="mono" id="lang-label">
          The language you speak
        </div>
        <div role="group" aria-labelledby="lang-label" className="flex flex-wrap gap-2">
          {sellerLanguages.map((l) => (
            <Button
              key={l.code}
              className="ob-lang"
              aria-pressed={lang === l.code}
              onClick={() => setLang(l.code)}
              lang={l.code}
            >
              {l.label}
            </Button>
          ))}
        </div>
        <div className="text-[0.8125rem] leading-normal text-text-2">
          You&apos;ll record in this language. Listings are written in English for the agents.
        </div>
      </div>

      <div className="flex-1" />

      <Button tone="lime" size="big" className="w-full" onClick={next} aria-busy={saving} disabled={saving}>
        <span>Continue</span>
        <ArrowRightIcon size={18} strokeWidth={2.4} />
      </Button>
    </OnboardingShell>
  );
}
