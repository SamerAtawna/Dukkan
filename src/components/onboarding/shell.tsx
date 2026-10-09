import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  /** 1 | 2 | 3 — drives the wrapper class, the step label and the progress bar. */
  step: 1 | 2 | 3;
  /** Left side of the phone header row (wordmark, shop name or a back button). */
  phoneLead: ReactNode;
  /** Optional extra row shown only on desktop, under the nav (Onboard2 back button). */
  desktopLead?: ReactNode;
  children: ReactNode;
};

/**
 * Onboarding page frame. Phone: header row + progress bar inside the column.
 * Desktop: "Dukkan · Step N of 3" top bar, then the column.
 */
export function OnboardingShell({ step, phoneLead, desktopLead, children }: Props) {
  const stepLabel = `Step ${step} of 3`;
  const progressLabel = step === 3 ? "Setup complete" : `Setup progress, step ${step} of 3`;

  return (
    <div className={cn("r-onboarding flex min-h-dvh flex-col bg-ground text-text", `ob-${step}`)}>
      <nav className="nav hidden md:flex" aria-label="Setup">
        <div className="hd text-lg font-semibold tracking-[-0.01em]">Dukkan</div>
        <div className="mono">{stepLabel}</div>
      </nav>

      <main className="col">
        <div className="flex items-center justify-between gap-3 md:hidden">
          {phoneLead}
          <div className="mono">{stepLabel}</div>
        </div>
        {desktopLead && <div className="hidden items-center justify-between gap-3 md:flex">{desktopLead}</div>}

        <div className="steps" aria-label={progressLabel}>
          <span className={cn(step >= 1 && "on")} />
          <span className={cn(step >= 2 && "on")} />
          <span className={cn(step >= 3 && "on")} />
        </div>

        {children}
      </main>
    </div>
  );
}
