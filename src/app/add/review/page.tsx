"use client";

import { Suspense } from "react";
import { TopNav } from "@/components/nav/top-nav";
import { BackLink } from "@/components/nav/back-link";
import { Button, ButtonLink } from "@/components/ui/button";
import { useShop } from "@/lib/store";
import { PublishScene } from "@/components/add/publish-scene";
import {
  ListingCard,
  PublishButton,
  QuestionCard,
  ReviewStatusLine,
  useListingReveal,
} from "@/components/add/listing-review";
import "../add.css";

export default function ReviewPage() {
  // useRouter (inside the hook) needs a Suspense boundary under cacheComponents, like the other routes.
  return (
    <Suspense fallback={<div className="r-add min-h-dvh bg-ground" />}>
      <ReviewScreen />
    </Suspense>
  );
}

function ReviewScreen() {
  const reveal = useListingReveal();
  const shopName = useShop((s) => s.name);
  const canReplay = Boolean(reveal.listing) && reveal.status !== "writing";
  const publishing = reveal.status === "publishing" || reveal.status === "published";

  return (
    <div className="r-add flex min-h-dvh flex-col bg-ground text-text">
      <TopNav className="hidden md:flex" backHref="/add" backLabel="Back to add a product" />

      <main className="col flex-1 !gap-4 md:!gap-6">
        {/* Phone header: back, title, Replay */}
        <div className="flex items-center gap-3 md:hidden">
          <BackLink href="/add" label="Back to add a product" />
          <h1 className="hd m-0 text-xl font-medium tracking-[-0.01em]">Your listing</h1>
          <div className="flex-1" />
          {canReplay && (
            <Button size="sm" onClick={reveal.play}>
              Replay
            </Button>
          )}
        </div>
        <div className="md:hidden">
          <ReviewStatusLine status={reveal.status} hint="tap" />
        </div>

        {/* Desktop header: status + title, Replay */}
        <div className="hidden flex-wrap items-end justify-between gap-4 md:flex">
          <div className="flex flex-col gap-2.5">
            <ReviewStatusLine status={reveal.status} hint="click" />
            <h1 className="hd m-0 text-[2.125rem] font-medium leading-[1.15] tracking-[-0.02em]">Your listing</h1>
          </div>
          {canReplay && <Button onClick={reveal.play}>Replay</Button>}
        </div>

        {reveal.status === "empty" ? (
          <div className="card flex flex-col gap-3 rounded-[26px] p-5 md:p-8">
            <div className="hd text-[1.0625rem] font-medium leading-[1.3] md:text-xl">Say what you are selling first.</div>
            <p className="m-0 text-sm leading-normal text-text-2 md:text-[0.9375rem]">
              Record a voice note or type a description on the previous screen, and the listing writes itself here.
            </p>
            <div>
              <ButtonLink href="/add">Back to add a product</ButtonLink>
            </div>
          </div>
        ) : reveal.status === "error" ? (
          <div className="q flex flex-col gap-2.5 rounded-3xl px-5 py-[18px] md:px-6 md:py-[22px]" role="alert">
            <div className="mono text-saffron-ink">Could not write the listing</div>
            <div className="text-sm leading-normal md:text-[0.9375rem]">{reveal.error}</div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={() => void reveal.retry()}>Try again</Button>
              <ButtonLink href="/add">Back</ButtonLink>
            </div>
          </div>
        ) : (
          <>
            <ListingCard {...reveal} />
            <QuestionCard {...reveal} />
          </>
        )}

        <div className="flex-1 md:hidden" />

        {reveal.status !== "empty" && reveal.status !== "error" && (
          <>
            <PublishButton className="w-full md:hidden" status={reveal.status} publish={reveal.publish} />
            <div className="hidden flex-wrap justify-end gap-3 md:flex">
              <PublishButton status={reveal.status} publish={reveal.publish} />
            </div>
          </>
        )}
      </main>

      {publishing && (
        <PublishScene
          phase={reveal.status === "published" ? "placed" : "saving"}
          shopName={shopName}
          title={reveal.title || reveal.listing?.title || ""}
          photo={reveal.photos[0]}
          art={reveal.listing?.art ?? "generic"}
          onDone={reveal.finish}
        />
      )}
    </div>
  );
}
