"use client";

import { cn } from "@/lib/cn";
import { ButtonLink } from "@/components/ui/button";
import type { ShopEvent } from "@/lib/types";

/**
 * "Latest" card. When a paid event arrives during the visit it slides in from above
 * (300ms ease-out) and the amount flashes lime once. At most four rows.
 */
export function LatestList({ events, newPaidId }: { events: ShopEvent[]; newPaidId: string | null }) {
  const rows = events.slice(0, 4);

  return (
    <div className="mt-1 flex flex-col gap-2 md:mt-2 md:gap-2.5">
      <div className="mono">Latest</div>
      <div className="card flex flex-col rounded-[22px] px-1.5 py-1 md:rounded-3xl md:px-2 md:py-1.5">
        {rows.length === 0 ? (
          <div className="px-2.5 py-4 text-[0.875rem] leading-normal text-text-2 md:px-3.5 md:py-5">
            Nothing yet. When an agent searches your shop or pays, it shows up here.
          </div>
        ) : (
          rows.map((ev, i) => (
            <EventRow key={ev.id} ev={ev} last={i === rows.length - 1} entering={ev.kind === "paid" && ev.id === `paid-${newPaidId}`} />
          ))
        )}
      </div>
    </div>
  );
}

function EventRow({ ev, last, entering }: { ev: ShopEvent; last: boolean; entering: boolean }) {
  const rtl = ev.summaryLang === "ar" || ev.summaryLang === "he";
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-2.5 py-3 md:gap-4 md:px-3.5 md:py-4",
        !last && "bb",
        entering && "ev1"
      )}
    >
      <div className="flex min-w-0 flex-col gap-[3px] md:gap-1">
        <div className="ar" dir={rtl ? "rtl" : "ltr"} lang={ev.summaryLang}>
          {ev.summary}
          {ev.amount && (
            <span className={cn("amt", entering && "flash")} dir="ltr">
              {ev.amount}
            </span>
          )}
        </div>
        <div className={cn("mono", ev.metaWarn && "text-saffron-ink")}>{ev.meta}</div>
      </div>
      <ButtonLink href={ev.action.href} className="px-3.5 text-[0.8125rem] md:px-[18px] md:text-sm">
        {ev.action.label}
      </ButtonLink>
    </div>
  );
}
