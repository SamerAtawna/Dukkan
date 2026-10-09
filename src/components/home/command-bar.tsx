"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { clock, guessLang, isRtlText } from "@/lib/add-config";
import { readSse } from "@/lib/sse";
import { useShop } from "@/lib/store";
import { useDraft } from "@/lib/store-draft";
import { ERROR_COPY, useRecorder } from "@/components/add/recorder";
import { ArrowRightIcon, MicIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import "./command-bar.css";

/**
 * "Ask or tell Dukkan": the seller's one entry point on Home. Speak (the same microphone as
 * /add) or type, in any language. Questions go to the seller assistant (/api/assistant) and the
 * answer streams into a card under the bar. When the seller describes something they sell, the
 * assistant hands the words to the add-product flow and the listing writes itself there.
 */

type Turn = { role: "user" | "assistant"; text: string };
type Answer = {
  text: string;
  steps: string[];
  streaming: boolean;
  error?: string;
  /** The assistant proposed opening/closing the shop; the seller confirms with a tap (never the model). */
  proposeOpen?: boolean;
};

const STEP_LABEL: Record<string, string> = {
  today: "Checking today",
  orders: "Reading orders",
  searches: "Reading agent searches",
  products: "Reading the catalogue",
  start_listing: "Opening the listing",
  set_open: "Updating the shop",
};

const STEP_LINK: Record<string, { label: string; href: string }> = {
  orders: { label: "Open orders", href: "/orders" },
  searches: { label: "Agent searches", href: "/searches" },
  products: { label: "Products", href: "/products" },
};

export function CommandBar() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const turns = useRef<Turn[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const rec = useRecorder("idle", (transcript, lang) => void ask(transcript, lang ?? useShop.getState().lang, "voice"));
  const recording = rec.stage === "recording";
  const writing = rec.stage === "writing";
  const working = busy || writing;

  async function ask(text: string, lang: string, source: "typed" | "voice") {
    const msg = text.trim();
    if (!msg || busy) return;
    setBusy(true);
    setAnswer({ text: "", steps: [], streaming: true });
    const history = [...turns.current, { role: "user" as const, text: msg }];
    const patch = (fn: (a: Answer) => Answer) => setAnswer((a) => (a ? fn(a) : a));

    let handoff = false;
    let finalText = "";
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, lang }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        throw new Error(
          data.code === "NOT_CONFIGURED"
            ? "The assistant is not set up yet. Add ANTHROPIC_API_KEY to .env.local and restart the dev server."
            : data.code === "UNAUTHORIZED"
              ? "Sign in as the seller first."
              : (data.error ?? `The assistant did not answer (${res.status}).`)
        );
      }
      await readSse(res.body, (ev) => {
        if (ev.type === "text") patch((a) => ({ ...a, text: a.text + ev.delta }));
        else if (ev.type === "tool") {
          if (ev.name === "start_listing") handoff = true;
          const proposeOpen = ev.name === "set_open" ? Boolean((ev.input as { open?: boolean }).open) : undefined;
          patch((a) => ({ ...a, text: "", steps: [...a.steps, ev.name], ...(proposeOpen === undefined ? {} : { proposeOpen }) }));
        } else if (ev.type === "done") {
          finalText = ev.text;
          patch((a) => ({ ...a, text: ev.text || a.text, streaming: false }));
        } else if (ev.type === "error") patch((a) => ({ ...a, error: ev.message, streaming: false }));
      });
      patch((a) => ({ ...a, streaming: false }));
      turns.current = [...history, { role: "assistant", text: finalText }];
    } catch (err) {
      patch((a) => ({ ...a, error: err instanceof Error ? err.message : "The assistant did not answer.", streaming: false }));
    } finally {
      setBusy(false);
    }

    if (handoff) {
      // The seller was describing a product. A voice note is already in the draft (with its audio);
      // typed words go in now. The add flow opens on its "done" stage with the transcript in place.
      if (source === "typed") useDraft.getState().setTranscript(msg, lang, 0, null);
      router.push("/add?stage=done");
    } else if (source === "voice") {
      useDraft.getState().setTranscript("", null, 0, null); // a question is not a product
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || working || recording) return;
    if (rec.stage === "error") rec.again();
    setInput("");
    void ask(text, guessLang(text, useShop.getState().lang), "typed");
  }

  function onMic() {
    if (recording) rec.stop();
    else if (!working) void rec.start();
  }

  function close() {
    setAnswer(null);
    turns.current = [];
    if (rec.stage === "error") rec.again();
    inputRef.current?.focus();
  }

  const lastStep = answer?.steps[answer.steps.length - 1];
  const links = answer && !answer.streaming ? answer.steps.filter((s, i, arr) => STEP_LINK[s] && arr.indexOf(s) === i).map((s) => STEP_LINK[s]) : [];
  const rtl = answer?.text ? isRtlText(answer.text) : false;
  const micError = rec.stage === "error" ? ERROR_COPY[rec.error] : null;
  const shopOpen = useShop((s) => s.open);
  const setOpen = useShop((s) => s.setOpen);
  const proposal =
    answer && !answer.streaming && answer.proposeOpen !== undefined && answer.proposeOpen !== shopOpen ? answer.proposeOpen : null;

  return (
    <div className={cn("r-cmd flex flex-col gap-2.5 md:gap-3", recording && "rec")}>
      <form className="card flex items-center gap-2.5 rounded-full p-2.5 md:gap-3 md:p-3" onSubmit={onSubmit}>
        <button
          className="mic"
          type="button"
          aria-label={recording ? "Stop and send" : "Talk to Dukkan"}
          aria-pressed={recording}
          disabled={working}
          onClick={onMic}
        >
          <MicIcon className="ico ico-mic" />
          <span className="ico ico-stop" />
        </button>

        {recording || writing ? (
          <div className="status" aria-live="polite">
            <span className="dot" />
            <span className="mono text-lime-ink">{recording ? `Listening · ${clock(rec.secs)}` : "Writing it down…"}</span>
          </div>
        ) : (
          <>
            <label className="vh" htmlFor="cmd">
              Ask or tell Dukkan anything
            </label>
            <input
              ref={inputRef}
              className="input"
              id="cmd"
              type="text"
              placeholder={working ? "Working…" : "Ask or tell Dukkan…"}
              autoComplete="off"
              dir="auto"
              value={input}
              disabled={working}
              onChange={(e) => setInput(e.target.value)}
            />
          </>
        )}

        <button className="icon" type="submit" aria-label="Send" disabled={working || recording || !input.trim()}>
          <ArrowRightIcon size={20} />
        </button>
      </form>

      {micError ? (
        <div className="ans q flex flex-col gap-2 px-4 py-3.5 md:px-5 md:py-4" role="alert">
          <div className="mono text-saffron-ink">{micError.label}</div>
          <div className="text-sm leading-normal md:text-[0.9375rem]">{micError.body}</div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={() => void rec.start()}>
              Try again
            </Button>
            <Button size="sm" onClick={close}>
              Close
            </Button>
          </div>
        </div>
      ) : answer ? (
        <div className="ans card flex flex-col gap-2.5 rounded-[22px] px-4 py-3 md:rounded-3xl md:px-5 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="mono" aria-live="polite">
              {answer.streaming ? `${lastStep ? STEP_LABEL[lastStep] ?? "Working" : "Thinking"}…` : "Dukkan"}
            </span>
            {!answer.streaming && (
              <button type="button" className="close mono" onClick={close}>
                Close
              </button>
            )}
          </div>

          {answer.text ? (
            <p className="ans-text" dir={rtl ? "rtl" : "ltr"} aria-live="polite">
              {answer.text}
            </p>
          ) : answer.streaming ? (
            <div className="flex flex-col gap-2.5 py-1" aria-hidden="true">
              <span className="sh" style={{ width: "88%" }} />
              <span className="sh" style={{ width: "62%" }} />
            </div>
          ) : null}

          {answer.error && (
            <div className="q px-4 py-3 text-sm" role="alert">
              <span className="mono text-saffron-ink">Could not answer · </span>
              {answer.error}
            </div>
          )}

          {(links.length > 0 || proposal !== null) && (
            <div className="flex flex-wrap gap-2">
              {proposal !== null && (
                <Button size="sm" tone="lime" onClick={() => setOpen(proposal)}>
                  {proposal ? "Open the shop to agents" : "Close the shop to agents"}
                </Button>
              )}
              {links.map((l) => (
                <ButtonLink key={l.href} href={l.href} size="sm">
                  {l.label}
                </ButtonLink>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
