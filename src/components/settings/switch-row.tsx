"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
  className?: string;
};

/** Settings row with a real switch (`role="switch"` + `aria-checked`, `.sw` from Components). */
export function SwitchRow({ label, hint, checked, onChange, ariaLabel, className }: Props) {
  return (
    <div className={cn("row", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className={cn("text-[0.9375rem]", hint && "font-medium")}>{label}</div>
        {hint && (
          <div className="text-[0.8125rem] text-text-2" aria-live="polite">
            {hint}
          </div>
        )}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={ariaLabel} onClick={onChange} className="sw" />
    </div>
  );
}
