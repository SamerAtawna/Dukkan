"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { draftStages, type DraftStage } from "@/lib/add-config";
import { useShop } from "@/lib/store";
import { TopNav } from "@/components/nav/top-nav";
import { PhoneHeader } from "@/components/nav/phone-header";
import { PhotoGrid } from "@/components/add/photo-grid";
import { DoneStage, ErrorStage, RecordStage, TypeStage, WritingStage, useRecorder } from "@/components/add/recorder";
import "./add.css";

export default function AddPage() {
  return (
    <Suspense fallback={null}>
      <StageFromUrl />
    </Suspense>
  );
}

/** `?stage=idle|recording|writing|done|error|type` jumps the screen to a state for demos. */
function StageFromUrl() {
  const params = useSearchParams();
  const requested = params.get("stage");
  const initial: DraftStage = draftStages.includes(requested as DraftStage) ? (requested as DraftStage) : "idle";
  return <AddScreen key={initial} initial={initial} />;
}

function AddScreen({ initial }: { initial: DraftStage }) {
  const rec = useRecorder(initial);
  const { stage } = rec;
  const load = useShop((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);

  const stageView = (variant: "phone" | "desktop") =>
    stage === "idle" || stage === "recording" ? (
      <RecordStage {...rec} />
    ) : stage === "writing" ? (
      <WritingStage variant={variant} />
    ) : stage === "error" ? (
      <ErrorStage error={rec.error} start={rec.start} typeInstead={rec.typeInstead} />
    ) : stage === "type" ? (
      <TypeStage submitTyped={rec.submitTyped} again={rec.again} />
    ) : (
      <DoneStage again={rec.again} typeInstead={rec.typeInstead} variant={variant} />
    );

  return (
    <div className="r-add flex min-h-dvh flex-col bg-ground text-text">
      <TopNav className="hidden md:flex" backHref="/" backLabel="Back to home" />

      <main className="col flex-1">
        <div className="md:hidden">
          <PhoneHeader title="Add a product" backHref="/" backLabel="Back to home" />
        </div>
        <div className="hidden flex-col gap-1.5 md:flex">
          <div className="mono">New product</div>
          <h1 className="hd m-0 text-[2.125rem] font-medium leading-[1.15] tracking-[-0.02em]">Add a product</h1>
        </div>

        <PhotoGrid />

        {/* Phone: the stage fills the remaining height. */}
        <div className="flex flex-1 flex-col md:hidden">{stageView("phone")}</div>

        {/* Desktop: the stage lives in one big card. */}
        <div className="card box-border hidden min-h-[360px] flex-col justify-center gap-6 rounded-[32px] px-8 py-10 md:flex">
          {stageView("desktop")}
        </div>
      </main>
    </div>
  );
}
