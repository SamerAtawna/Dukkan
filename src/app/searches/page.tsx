"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { SearchesReport } from "@/lib/types";
import { TopNav } from "@/components/nav/top-nav";
import { TabBar } from "@/components/nav/tab-bar";
import { BackLink } from "@/components/nav/back-link";
import { Button, ButtonLink } from "@/components/ui/button";
import { SearchRow } from "@/components/searches/search-row";
import "./searches.css";

/** `/searches`: what agents asked the shop for this week, straight from the catalogue log. */
export default function SearchesPage() {
  const [report, setReport] = useState<SearchesReport | null>(null);
  const [failed, setFailed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api
      .get<SearchesReport>("/api/searches")
      .then(setReport)
      .catch(() => setFailed(true));
  }, []);

  const summaryLine = report
    ? `${report.period} · ${report.total} ${report.total === 1 ? "search" : "searches"} · ${report.found} found something`
    : failed
      ? "Could not load searches"
      : "Loading…";
  const insight = report?.insight && !dismissed ? report.insight : null;

  return (
    <div className="r-searches flex min-h-dvh flex-col bg-ground text-text">
      <TopNav className="hidden md:flex" />

      <main className="col flex-1 gap-[18px] md:gap-6 md:pt-8">
        {/* Same header on phone and desktop: back arrow + title inside the column. */}
        <div className="flex items-center gap-3">
          <BackLink href="/" label="Back to home" />
          <div className="flex flex-col gap-0.5">
            <h1 className="hd m-0 text-xl font-medium tracking-[-0.01em] [text-wrap:pretty]">What agents looked for</h1>
            <div className="mono" aria-live="polite">
              {summaryLine}
            </div>
          </div>
        </div>

        {/* Insight: the one saffron card. The most-wanted thing the shop does not sell. */}
        {insight && (
          <div className="q flex flex-col gap-2 px-[18px] py-4">
            <div className="mono text-saffron-ink">Worth making</div>
            <div className="hd text-base font-medium leading-[1.35] [text-wrap:pretty]">
              {insight.count} {insight.count === 1 ? "agent" : "agents"} wanted {insight.query}. You don&apos;t sell it yet.
            </div>
            <div className="flex gap-2 pt-1">
              <ButtonLink href="/add" className="px-3.5 text-[0.8125rem]">
                Add it
              </ButtonLink>
              <Button className="border-[#E3C98F] bg-transparent px-3.5 text-[0.8125rem] shadow-none" onClick={() => setDismissed(true)}>
                Not for me
              </Button>
            </div>
          </div>
        )}

        {report && report.searches.length > 0 ? (
          <div className="card rounded-[22px] px-1.5 py-1">
            {report.searches.map((s) => (
              <SearchRow key={s.id} s={s} />
            ))}
          </div>
        ) : report ? (
          <div className="card rounded-[22px] px-[18px] py-5 text-[0.9375rem] leading-normal text-text-2">
            No agent has searched your shop this week. Every search lands here the moment it happens.
          </div>
        ) : null}

        <div className="flex-1" />
        <div className="px-1 text-[0.8125rem] leading-normal text-text-2">
          Searches are what AI agents asked your shop for. A miss means an agent wanted something you don&apos;t list.
        </div>

        <TabBar className="md:hidden" />
      </main>
    </div>
  );
}
