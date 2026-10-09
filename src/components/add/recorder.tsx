"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { addTimings, clock, guessLang, isRtlText, LANG_LABELS, type DraftStage } from "@/lib/add-config";
import { useDraft } from "@/lib/store-draft";
import { useShop } from "@/lib/store";
import { MicIcon, ArrowRightIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { VoiceNote } from "@/components/add/voice-note";
import { DESKTOP, useMedia } from "@/components/add/use-media";

export type RecordError = "mic" | "silent" | "config" | "failed";

/**
 * Voice capture stage machine (Add.dc.html), now on a real microphone. Also drives the mic in the
 * home command bar, which passes `onDone` to hear the transcript the moment it lands.
 *   idle → (tap mic) recording → (tap stop, or at 60s) writing → (transcribed) done
 *   error (mic blocked, nothing heard, backend missing) → Try again / Type instead
 *   type: the seller types the description instead of recording.
 */
export function useRecorder(initial: DraftStage, onDone?: (transcript: string, lang: string | null) => void) {
  const [stage, setStageState] = useState<DraftStage>(initial);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<RecordError>("mic");
  const stageRef = useRef<DraftStage>(initial);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const meter = useRef<{ ctx: AudioContext; analyser: AnalyserNode; peak: number; frames: number; loud: number } | null>(null);
  const startedAt = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const setTranscript = useDraft((s) => s.setTranscript);

  const setStage = useCallback((s: DraftStage) => {
    stageRef.current = s;
    setStageState(s);
  }, []);

  const clear = useCallback(() => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
  }, []);

  const releaseMic = useCallback(() => {
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
    recorder.current = null;
    void meter.current?.ctx.close().catch(() => undefined);
    meter.current = null;
  }, []);

  /** The mic's loudness right now (RMS, about 0 to 0.3 for speech), or null when it cannot be metered. */
  const levelBuf = useRef<Float32Array<ArrayBuffer> | null>(null);
  const level = useCallback((): number | null => {
    const m = meter.current;
    if (!m) return null;
    const buf = levelBuf.current ?? (levelBuf.current = new Float32Array(m.analyser.fftSize));
    m.analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }, []);

  /** Share of metered frames that were clearly above the noise floor. */
  const spokenShare = useCallback(() => {
    const m = meter.current;
    return m && m.frames > 0 ? m.loud / m.frames : 1;
  }, []);

  const transcribe = useCallback(
    async (blob: Blob, durationSecs: number) => {
      const shownAt = Date.now();
      const form = new FormData();
      form.append("audio", blob, "note.webm");
      form.append("lang", useShop.getState().lang);
      let result: { transcript?: string; language?: string; empty?: boolean; error?: string } = {};
      let status = 0;
      try {
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        status = res.status;
        result = await res.json();
      } catch {
        status = 0;
      }
      // Keep the shimmer on screen for the design's beat even when the model is quick.
      await new Promise((r) => setTimeout(r, Math.max(0, addTimings.writingMinMs - (Date.now() - shownAt))));
      if (stageRef.current !== "writing") return;
      if (status === 503) {
        setError("config");
        setStage("error");
      } else if (status !== 200) {
        setError("failed");
        setStage("error");
      } else if (!result.transcript || result.empty) {
        setError("silent");
        setStage("error");
      } else {
        setTranscript(result.transcript, result.language ?? null, durationSecs, URL.createObjectURL(blob));
        setStage("done");
        onDoneRef.current?.(result.transcript, result.language ?? null);
      }
    },
    [setStage, setTranscript]
  );

  const stop = useCallback(() => {
    clear();
    const rec = recorder.current;
    if (stageRef.current !== "recording" || !rec) return;
    const durationSecs = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    const spoken = spokenShare();
    setStage("writing");
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
      releaseMic();
      // Nothing above the noise floor for the whole note: do not ask the model to guess.
      if (spoken < 0.02) {
        setError("silent");
        setStage("error");
        return;
      }
      void transcribe(blob, durationSecs);
    };
    if (rec.state !== "inactive") rec.stop();
  }, [clear, releaseMic, setStage, transcribe, spokenShare]);

  const start = useCallback(async () => {
    clear();
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("mic");
      setStage("error");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("mic");
      setStage("error");
      return;
    }
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) =>
      MediaRecorder.isTypeSupported(t)
    );
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunks.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    recorder.current = rec;
    startedAt.current = Date.now();
    rec.start(250);
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      meter.current = { ctx, analyser, peak: 0, frames: 0, loud: 0 };
    } catch {
      meter.current = null; // no metering: the server still handles silence
    }
    setStage("recording");
    setSecs(0);
    const buf = new Float32Array(1024);
    tick.current = setInterval(() => {
      const m = meter.current;
      if (m) {
        m.analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        m.frames += 1;
        if (rms > 0.01) m.loud += 1;
        if (rms > m.peak) m.peak = rms;
      }
      const s = Math.round((Date.now() - startedAt.current) / 1000);
      setSecs(Math.min(addTimings.maxSecs, s));
      if (s >= addTimings.maxSecs) stop();
    }, 250);
  }, [clear, setStage, stop]);

  const again = useCallback(() => {
    clear();
    releaseMic();
    setStage("idle");
    setSecs(0);
  }, [clear, releaseMic, setStage]);

  const typeInstead = useCallback(() => {
    clear();
    releaseMic();
    setStage("type");
    setSecs(0);
  }, [clear, releaseMic, setStage]);

  const submitTyped = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      const lang = guessLang(t, useShop.getState().lang);
      setTranscript(t, lang, 0, null);
      setStage("done");
      onDoneRef.current?.(t, lang);
    },
    [setStage, setTranscript]
  );

  // Timers and the mic die with the component. A different `initial` (?stage=) remounts via `key` in the page.
  useEffect(
    () => () => {
      clear();
      releaseMic();
    },
    [clear, releaseMic]
  );

  return { stage, secs, error, start, stop, again, typeInstead, submitTyped, level };
}

/** How often the waveform takes a new sample; between samples the bars ease toward their targets. */
const WAVE_STEP_MS = 70;

/**
 * Drives the waveform from the real mic level while recording: a scrolling history, newest sample
 * on the right, written straight to each bar's transform (no React state per frame). Purpose:
 * feedback that the mic hears the seller. Without metering, or with reduced motion, the CSS
 * fallback stays (a decorative bounce, or still bars).
 */
function useLiveWave(rec: boolean, level: () => number | null, count: number) {
  const wave = useRef<HTMLDivElement>(null);
  const [driven, setDriven] = useState(false);

  useEffect(() => {
    if (!rec || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bars = Array.from(wave.current?.children ?? []) as HTMLElement[];
    const history = new Array<number>(count).fill(0);
    const shown = new Array<number>(count).fill(0);
    let raf = 0;
    let last = 0;
    let started = false;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const rms = level();
      if (rms === null) return;
      if (!started) {
        started = true;
        setDriven(true);
      }
      if (now - last >= WAVE_STEP_MS) {
        last = now;
        // Speech sits around 0.02–0.2 RMS; the square root keeps quiet voices visible.
        const v = Math.sqrt(Math.min(1, Math.max(0, rms - 0.004) / 0.16));
        history.shift();
        history.push(v);
      }
      for (let i = 0; i < bars.length; i++) {
        shown[i] += (history[i] - shown[i]) * 0.35;
        bars[i].style.transform = `scaleY(${(0.18 + 0.82 * shown[i]).toFixed(3)})`;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      setDriven(false);
      for (const b of bars) b.style.transform = "";
    };
  }, [rec, level, count]);

  return { wave, driven };
}

type Props = ReturnType<typeof useRecorder>;

/** Idle + recording: the big mic, ripple rings, waveform and the "Type instead" escape. */
export function RecordStage({ stage, secs, start, stop, typeInstead, level }: Props) {
  const desktop = useMedia(DESKTOP);
  const rec = stage === "recording";
  const bars = desktop ? 36 : 28;
  const { wave, driven } = useLiveWave(rec, level, bars);

  return (
    <div
      className={cn(
        "stage flex flex-1 flex-col items-center justify-center gap-7 text-center",
        rec && "rec"
      )}
    >
      <div className="micwrap">
        <span className="ring" />
        <span className="ring r2" />
        <span className="ring r3" />
        <button
          className="bigmic"
          type="button"
          aria-label={rec ? "Stop recording" : "Start recording"}
          aria-pressed={rec}
          onClick={rec ? stop : () => void start()}
        >
          <MicIcon className="ico ico-mic h-11 w-11 md:h-[52px] md:w-[52px]" />
          <span className="ico ico-stop" />
        </button>
      </div>

      <div className="txtwrap">
        <div className="txt idleTxt">
          <div className="hd text-[1.0625rem] font-medium leading-[1.3] [text-wrap:pretty] md:text-xl">
            Tell me about it in your own words.
          </div>
          <div className="text-sm leading-normal text-text-2 md:text-[0.9375rem]">
            Any language. What it is, the size, the price.
          </div>
        </div>
        <div className="txt recTxt" aria-live="polite">
          <div ref={wave} className={cn("wave live", driven && "driven")} aria-hidden="true">
            {Array.from({ length: bars }, (_, i) => (
              <span key={i} className="bar" />
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="dot livedot" />
            <span className="mono text-lime-ink">Listening · {clock(secs)}</span>
          </div>
        </div>
      </div>

      <Button className="alt" onClick={typeInstead}>
        Type instead
      </Button>
    </div>
  );
}

/** The transcription wait: live dot and three shimmer lines, right-to-left. */
export function WritingStage({ variant }: { variant: "phone" | "desktop" }) {
  const lang = useShop((s) => s.lang);
  const lines = (
    <div dir={lang === "en" ? "ltr" : "rtl"} className="flex flex-col gap-2.5 py-1 md:gap-3 md:py-1.5">
      <span className="sh md:h-[18px]" style={{ width: "92%" }} />
      <span className="sh md:h-[18px]" style={{ width: "78%" }} />
      <span className="sh md:h-[18px]" style={{ width: "46%" }} />
    </div>
  );
  const status = (
    <div className="flex items-center gap-2.5" aria-live="polite">
      <span className="dot livedot" />
      <span className="mono text-lime-ink">Writing it down…</span>
    </div>
  );
  if (variant === "desktop") {
    return (
      <div className="fade flex flex-col gap-3">
        {status}
        {lines}
      </div>
    );
  }
  return (
    <div className="fade flex min-h-0 flex-1 flex-col gap-3.5">
      <div className="card flex flex-col gap-3 rounded-3xl px-5 py-[18px]">
        {status}
        {lines}
      </div>
    </div>
  );
}

export const ERROR_COPY: Record<RecordError, { label: string; title: string; body: string }> = {
  mic: {
    label: "Could not record",
    title: "The microphone is blocked.",
    body: "Allow the microphone in your browser settings, or type your description instead.",
  },
  silent: {
    label: "Could not hear you",
    title: "The recording was silent.",
    body: "Hold the phone a little closer and say what it is, the size and the price. Or type it instead.",
  },
  config: {
    label: "Not set up yet",
    title: "Transcription is not configured.",
    body: "Add GEMINI_API_KEY to .env.local and restart the dev server. You can still type the description.",
  },
  failed: {
    label: "Something went wrong",
    title: "Could not write that down.",
    body: "The transcription service did not answer. Try again, or type your description instead.",
  },
};

/** Mic blocked / nothing heard / backend missing: the one saffron warning surface. */
export function ErrorStage({ error, start, typeInstead }: Pick<Props, "error" | "start" | "typeInstead">) {
  const copy = ERROR_COPY[error];
  return (
    <div className="fade flex w-full flex-1 flex-col justify-center gap-3.5 md:mx-auto md:max-w-[480px] md:flex-none">
      <div className="q flex flex-col gap-2.5 rounded-3xl px-5 py-[18px] md:px-6 md:py-[22px]" role="alert">
        <div className="mono text-saffron-ink">{copy.label}</div>
        <div className="hd text-[1.0625rem] font-medium leading-[1.3] [text-wrap:pretty] md:text-xl">{copy.title}</div>
        <div className="text-sm leading-normal text-text-2 md:text-[0.9375rem]">{copy.body}</div>
        <div className="flex flex-wrap gap-2 pt-1 md:gap-2.5">
          <Button onClick={() => void start()}>Try again</Button>
          <Button onClick={typeInstead}>Type instead</Button>
        </div>
      </div>
    </div>
  );
}

/** Typing instead of talking: the same words, in the seller's language, by keyboard. */
export function TypeStage({ submitTyped, again }: Pick<Props, "submitTyped" | "again">) {
  const lang = useShop((s) => s.lang);
  const existing = useDraft((s) => s.transcript);
  const [text, setText] = useState(existing);
  const rtl = text ? isRtlText(text) : lang !== "en";
  return (
    <div className="fade flex w-full flex-1 flex-col gap-3.5 md:mx-auto md:max-w-[520px] md:flex-none">
      <div className="card flex flex-col gap-2.5 rounded-3xl px-5 py-[18px]">
        <label className="mono" htmlFor="typed">
          Describe it · {LANG_LABELS[lang] ?? "your language"}
        </label>
        <textarea
          id="typed"
          className={cn("edit m-0 min-h-[120px] w-full resize-none bg-transparent text-[1.0625rem] leading-[1.7] outline-none md:text-xl", rtl && "text-right")}
          dir="auto"
          lang={lang}
          placeholder={lang === "ar" ? "ما هو، المقاس، السعر…" : lang === "he" ? "מה זה, הגודל, המחיר…" : "What it is, the size, the price…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <Button onClick={again}>Record instead</Button>
        <Button tone="lime" size="big" onClick={() => submitTyped(text)} disabled={!text.trim()}>
          <span>Use this</span>
          <ArrowRightIcon size={18} strokeWidth={2.4} />
        </Button>
      </div>
    </div>
  );
}

/** Done: the voice note, what we heard (word by word), and the way forward. */
export function DoneStage({ again, typeInstead, variant }: Pick<Props, "again" | "typeInstead"> & { variant: "phone" | "desktop" }) {
  const transcript = useDraft((s) => s.transcript);
  const transcriptLang = useDraft((s) => s.transcriptLang);
  const audioUrl = useDraft((s) => s.audioUrl);
  const durationSecs = useDraft((s) => s.durationSecs);
  const words = transcript.split(/\s+/).filter(Boolean);
  const lang = transcriptLang ?? "";
  const rtl = isRtlText(transcript);
  const langLabel = LANG_LABELS[lang] ?? (lang && lang !== "und" ? lang.toUpperCase() : "your language");

  const transcriptBlock = (
    <div className="flex flex-col gap-2.5">
      <div className="mono">{words.length ? `What I heard · ${langLabel}` : "Nothing recorded yet"}</div>
      <p
        dir={rtl ? "rtl" : "ltr"}
        lang={lang || undefined}
        className={cn("m-0 text-[1.1875rem] font-normal leading-[1.75] md:text-2xl", rtl ? "text-right" : "text-left")}
      >
        {words.map((w, i) => (
          <span key={i}>
            <span className="wd" style={{ animationDelay: `${0.05 + Math.min(i, 40) * 0.07}s` }}>
              {w}
            </span>{" "}
          </span>
        ))}
      </p>
    </div>
  );
  const cta = words.length ? (
    <ButtonLink href="/add/review" tone="lime" size="big" className={variant === "phone" ? "w-full px-[18px]" : ""}>
      <span>Write my listing</span>
      <ArrowRightIcon size={18} strokeWidth={2.4} />
    </ButtonLink>
  ) : null;
  const alts = (
    <div className="flex flex-wrap gap-2 md:gap-2.5">
      <Button onClick={again}>Record again</Button>
      <Button onClick={typeInstead}>{words.length ? "Fix the words" : "Type instead"}</Button>
    </div>
  );
  const note = audioUrl ? <VoiceNote audioUrl={audioUrl} durationSecs={durationSecs} variant={variant === "desktop" ? "inset" : "card"} /> : null;

  if (variant === "desktop") {
    return (
      <div className="reveal flex flex-col gap-5">
        {note}
        {transcriptBlock}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {alts}
          {cta}
        </div>
      </div>
    );
  }
  return (
    <div className="reveal flex min-h-0 flex-1 flex-col gap-3.5">
      {note}
      <div className="card flex flex-col gap-2.5 rounded-3xl px-5 py-[18px]">{transcriptBlock}</div>
      {alts}
      <div className="flex-1" />
      {cta}
    </div>
  );
}
