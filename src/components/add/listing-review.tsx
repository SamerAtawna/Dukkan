"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { reviewTimings } from "@/lib/add-config";
import { useDraft, type ListingDraft } from "@/lib/store-draft";
import { useProducts } from "@/lib/store-products";
import { formatPrice, parsePrice, type Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/icons";
import { CushionArt } from "@/components/add/icons";

export type ReviewStatus = "writing" | "revealing" | "ready" | "error" | "empty" | "publishing" | "published";

/** The save is quick; the "putting it in your shop" beat needs at least this long to read. */
const MIN_PUBLISH_MS = 900;

/**
 * The AI-written listing, revealed field by field: title, price, details, description(+AI line), question.
 * Steps land at 300 + 450·i ms (Review.dc.html) once /api/listing has answered. Replay restarts the reveal;
 * Remove drops the AI-added line. Publish saves the product and goes home.
 */
export function useListingReveal() {
  const router = useRouter();
  const draft = useDraft();
  const addProduct = useProducts((s) => s.add);
  const [initial] = useState(() => useDraft.getState().listing);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<ReviewStatus>(() => (!draft.transcript ? "empty" : initial ? "revealing" : "writing"));
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [price, setPrice] = useState(initial?.price == null ? "" : formatPrice(initial.price));
  const [details, setDetails] = useState<string[]>(initial?.details ?? []);
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [ai, setAi] = useState(Boolean(initial?.aiAdded ?? true));
  const [stock, setStock] = useState(initial?.stock == null ? "" : String(initial.stock));
  const [answer, setAnswer] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const requested = useRef(false);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /** Schedules the five reveals; state is assumed to already be at step 0. */
  const schedule = useCallback(() => {
    clearTimers();
    for (let i = 0; i < reviewTimings.steps; i++) {
      timers.current.push(
        setTimeout(() => {
          setStep(i + 1);
          if (i + 1 === reviewTimings.steps) setStatus("ready");
        }, reviewTimings.firstStepMs + i * reviewTimings.stepGapMs)
      );
    }
  }, []);

  const seed = useCallback((l: ListingDraft) => {
    setTitle(l.title);
    setPrice(l.price === null ? "" : formatPrice(l.price));
    setDetails(l.details);
    setDesc(l.description);
    setAi(Boolean(l.aiAdded));
    setStock(l.stock === null ? "" : String(l.stock));
  }, []);

  const request = useCallback(async (retry = false) => {
    const { transcript, transcriptLang, photos, setListing } = useDraft.getState();
    if (retry) {
      setStatus("writing");
      setError(null);
      setStep(0);
    }
    try {
      const listing = await api.post<ListingDraft>("/api/listing", {
        transcript,
        lang: transcriptLang ?? undefined,
        photos: photos.map((p) => p.url),
      });
      setListing(listing);
      seed(listing);
      setStatus("revealing");
      schedule();
    } catch (err) {
      setError(
        err instanceof ApiError && err.notConfigured
          ? "Listing writer is not configured. Add ANTHROPIC_API_KEY to .env.local and restart the dev server."
          : err instanceof Error
            ? err.message
            : "Could not write the listing"
      );
      setStatus("error");
    }
  }, [schedule, seed]);

  // Runs once per mount. React's dev double-invoke cleans up and re-runs it, so the guard
  // must reset in the cleanup or the request would never fire in development.
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    const { transcript, listing } = useDraft.getState();
    if (!transcript) return; // status already starts as "empty"
    if (listing) {
      schedule(); // fields were seeded from it in the initial state
      return () => {
        clearTimers();
        requested.current = false;
      };
    }
    // The request runs after mount (not inside it) so its state updates never cascade into this render.
    const kick = setTimeout(() => void request(), 0);
    return () => {
      clearTimeout(kick);
      clearTimers();
      requested.current = false;
    };
  }, [request, schedule]);

  const play = useCallback(() => {
    const { listing } = useDraft.getState();
    if (!listing) return;
    setStep(0);
    seed(listing);
    setStatus("revealing");
    schedule();
  }, [schedule, seed]);

  const publish = useCallback(async () => {
    const { listing, transcript, transcriptLang, photos } = useDraft.getState();
    if (!listing || status === "publishing") return;
    const parsedPrice = parsePrice(price);
    if (parsedPrice === null) {
      toast("Add a price before publishing");
      return;
    }
    setStatus("publishing");
    const started = Date.now();
    try {
      const extra = listing.question && !["stock", "price"].includes(listing.question.kind) ? answer.trim() : "";
      const product = await api.post<Product>("/api/products", {
        title: title.trim() || listing.title,
        shortTitle: listing.shortTitle,
        price: parsedPrice,
        stock: Math.max(0, Number.parseInt(stock, 10) || 1),
        details,
        description: extra ? `${desc.trim()} ${extra}` : desc.trim(),
        aiAdded: ai ? listing.aiAdded : null,
        transcript,
        transcriptLang,
        art: listing.art,
        photos,
        visible: true,
      });
      addProduct(product);
      await new Promise((r) => setTimeout(r, Math.max(0, MIN_PUBLISH_MS - (Date.now() - started))));
      setStatus("published"); // PublishScene plays the finish, then calls `finish`
    } catch (err) {
      setStatus("ready");
      toast(err instanceof Error ? err.message : "Could not publish");
    }
  }, [status, price, title, stock, details, desc, ai, answer, addProduct]);

  /** After the publish scene: clear the draft and go home, where the product is now live. */
  const finish = useCallback(() => {
    useDraft.getState().reset();
    router.push("/");
  }, [router]);

  return {
    step,
    status,
    error,
    listing: draft.listing,
    photos: draft.photos,
    title,
    setTitle,
    price,
    setPrice,
    details,
    setDetails,
    desc,
    setDesc,
    ai,
    dropAi: () => setAi(false),
    stock,
    setStock,
    answer,
    setAnswer,
    play,
    retry: () => request(true),
    publish,
    finish,
  };
}

type Reveal = ReturnType<typeof useListingReveal>;

/** "Writing it in English…" until every field is in, then "Ready". */
export function ReviewStatusLine({ status, hint }: { status: ReviewStatus; hint: "tap" | "click" }) {
  return (
    <div className="flex min-h-5 items-center gap-2.5" aria-live="polite">
      {status === "ready" || status === "publishing" ? (
        <span className="inr mono text-lime-ink">Ready · {hint} any line to change it</span>
      ) : status === "error" ? (
        <span className="mono text-saffron-ink">Could not write the listing</span>
      ) : status === "empty" ? (
        <span className="mono">Nothing to write yet</span>
      ) : (
        <>
          <span className="dot livedot" />
          <span className="mono text-lime-ink">Writing it in English…</span>
        </>
      )}
    </div>
  );
}

export function ListingCard({ step, listing, photos, title, setTitle, price, setPrice, details, desc, setDesc, ai, dropAi }: Reveal) {
  const photo = photos[0];
  return (
    <div className="card listing rounded-[26px] p-5 md:rounded-[32px] md:p-8">
      <div className="a-thumb flex flex-col gap-3.5">
        <div className="thumb overflow-hidden" aria-hidden="true">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- just-taken photo, a data URL
            <img src={photo.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <CushionArt className="h-14 w-14 md:h-[120px] md:w-[120px]" />
          )}
        </div>
        <div className="mono hidden md:block">
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </div>
      </div>

      <div className="a-title flex flex-col">
        <label className="mono" htmlFor="title">
          Title
        </label>
        {step < 1 ? (
          <div className="flex flex-col gap-2 py-1 md:gap-2.5 md:py-1.5">
            <span className="sh md:h-[18px]" style={{ width: "92%" }} />
            <span className="sh md:h-[18px]" style={{ width: "60%" }} />
          </div>
        ) : (
          <textarea
            className="inr hd edit text-[1.0625rem] font-medium leading-[1.3] tracking-[-0.01em] md:text-2xl md:leading-[1.25]"
            id="title"
            rows={2}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </div>

      <div className="a-price flex flex-col">
        <label className="mono" htmlFor="price">
          Price
        </label>
        {step < 2 ? (
          <div className="py-1.5 md:py-2">
            <span className="sh block h-[18px] w-[40%] md:h-6 md:w-[120px]" />
          </div>
        ) : (
          <input
            className="inr hd edit amt h-9 text-2xl font-semibold tracking-[-0.02em] md:h-11 md:text-[2rem]"
            id="price"
            inputMode="decimal"
            placeholder="$0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() => {
              const n = parsePrice(price);
              if (n !== null) setPrice(formatPrice(n));
            }}
          />
        )}
      </div>

      <div className="a-details flex flex-col gap-1.5 md:gap-2">
        <div className="mono">Details</div>
        {step < 3 ? (
          <div className="flex flex-wrap gap-2">
            <span className="sh h-[30px] w-[72px] rounded-full md:h-[34px] md:w-20" />
            <span className="sh h-[30px] w-24 rounded-full md:h-[34px] md:w-[104px]" />
            <span className="sh h-[30px] w-[110px] rounded-full md:h-[34px] md:w-[124px]" />
          </div>
        ) : (
          <div className="inr flex flex-wrap gap-2">
            {details.map((d) => (
              <span key={d} className="chip">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="a-desc flex flex-col gap-1.5 md:gap-2">
        <label className="mono" htmlFor="desc">
          Description
        </label>
        {step < 4 ? (
          <div className="flex flex-col gap-[9px] py-[3px] md:gap-2.5 md:py-1">
            <span className="sh" style={{ width: "100%" }} />
            <span className="sh" style={{ width: "96%" }} />
            <span className="sh" style={{ width: "70%" }} />
          </div>
        ) : (
          <textarea
            className="inr edit text-sm leading-[1.6] text-text md:text-base md:leading-[1.65]"
            id="desc"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        )}
        {step >= 4 && ai && listing?.aiAdded && (
          <div className="inr flex items-center gap-2.5 pt-2 md:gap-3">
            <span className="tag warn">Added by AI</span>
            <span className="min-w-0 flex-1 text-[0.8125rem] leading-[1.4] text-text-2 md:text-sm">{listing.aiAdded}</span>
            <Button className="px-3 text-xs md:px-3.5 md:text-[0.8125rem]" onClick={dropAi}>
              Remove
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** The saffron card for the one thing the AI could not hear. */
export function QuestionCard({ step, listing, stock, setStock, price, setPrice, answer, setAnswer }: Reveal) {
  const q = listing?.question;
  if (step < 5 || !q) return null;
  const isStock = q.kind === "stock";
  const isPrice = q.kind === "price";
  const value = isStock ? stock : isPrice ? price : "";
  const set = isStock ? setStock : isPrice ? (v: string) => setPrice(v) : () => {};
  return (
    <div className="q inr flex flex-col gap-3 px-5 py-[18px] md:gap-3.5 md:px-7 md:py-6">
      <div className="mono text-saffron-ink">One thing I could not hear</div>
      <label className="hd text-[1.0625rem] font-medium leading-[1.3] md:text-xl" htmlFor="answer">
        {q.text}
      </label>
      {(isStock || isPrice) && (
        <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
          <input
            className="qty flex-1 md:flex-[1_1_160px]"
            id="answer"
            type={isStock ? "number" : "text"}
            inputMode={isStock ? "numeric" : "decimal"}
            min={isStock ? 1 : undefined}
            placeholder={isStock ? "Number" : "$0.00"}
            value={value}
            onChange={(e) => set(e.target.value)}
          />
          {q.quick.slice(0, 3).map((n, i) => (
            // The third quick answer only exists on the desktop file.
            <span key={n} className={i === 2 ? "hidden md:contents" : "contents"}>
              <Button aria-pressed={value === String(n)} onClick={() => set(isPrice ? formatPrice(n) : String(n))}>
                {isPrice ? formatPrice(n) : n}
              </Button>
            </span>
          ))}
        </div>
      )}
      {!isStock && !isPrice && (
        <input
          className="qty"
          id="answer"
          type="text"
          placeholder="Your answer · added to the description"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
      )}
    </div>
  );
}

export function PublishButton({ className, status, publish }: { className?: string } & Pick<Reveal, "status" | "publish">) {
  const busy = status === "publishing" || status === "published";
  const ready = status === "ready";
  return (
    <Button tone="lime" size="big" className={className} onClick={() => void publish()} disabled={!ready && !busy} aria-busy={busy}>
      <span>{busy ? "Publishing…" : "Publish to my shop"}</span>
      <ArrowRightIcon size={18} strokeWidth={2.4} />
    </Button>
  );
}
