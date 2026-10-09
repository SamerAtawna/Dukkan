import { cn } from "@/lib/cn";
import { ButtonLink } from "@/components/ui/button";
import type { AgentSearch } from "@/lib/types";

const dotClass = { ok: "ok", miss: "miss", paused: "grey" } as const;

/** One agent query: status dot, query + count, meter, action. */
export function SearchRow({ s }: { s: AgentSearch }) {
  const miss = s.status === "miss";
  const meta =
    s.status === "miss" ? `×${s.count} · no match` : s.status === "paused" ? `×${s.count} · paused` : `×${s.count}`;
  const action =
    s.status === "miss"
      ? { label: "Add it", href: "/add" }
      : s.status === "paused"
        ? { label: "Unpause", href: s.productId ? `/products/${s.productId}` : "/products" }
        : { label: "See listing", href: s.productId ? `/products/${s.productId}` : "/products" };

  return (
    <div className="row">
      <span className={cn("sdot", dotClass[s.status])} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex justify-between gap-2">
          <span className="query">“{s.query}”</span>
          <span className={cn("mono", miss && "text-saffron-ink")}>{meta}</span>
        </div>
        <div
          className={cn("meter", miss && "miss")}
          style={{ "--v": s.share } as React.CSSProperties}
          role="meter"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={s.share}
          aria-label={`${s.count} searches for ${s.query}`}
        />
      </div>
      <ButtonLink href={action.href} className="px-3.5 text-[0.8125rem]">
        {action.label}
      </ButtonLink>
    </div>
  );
}
