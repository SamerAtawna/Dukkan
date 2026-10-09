"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { languages, useShop } from "@/lib/store";

/** Recording language chips: a `role="group"` of `aria-pressed` buttons; the picked one is the dark pill. */
export function LanguagePicker() {
  const lang = useShop((s) => s.lang);
  const setLang = useShop((s) => s.setLang);

  return (
    <div role="group" aria-label="Recording language" className="flex flex-wrap gap-2">
      {languages.map(({ code, label }) => {
        const on = lang === code;
        return (
          <Button
            key={code}
            lang={code === "en" ? undefined : code}
            aria-pressed={on}
            tone={on ? "selected" : "default"}
            onClick={() => setLang(code)}
            className={cn(
              "px-3.5 text-[0.8125rem] transition-[transform,box-shadow,background-color,color,border-color] duration-[160ms,180ms,160ms,160ms,160ms]",
              // The shared `selected` tone loses its text colour to the base `text-text` utility; force it here.
              on && "!text-surface"
            )}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
