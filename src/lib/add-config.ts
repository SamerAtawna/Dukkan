/** Stage machine and timings for the add-a-product flow (Add.dc.html, Review.dc.html). */

export type DraftStage = "idle" | "recording" | "writing" | "done" | "error" | "type";
export const draftStages: DraftStage[] = ["idle", "recording", "writing", "done", "error", "type"];

export const addTimings = {
  /** The recorder stops itself after this long. */
  maxSecs: 60,
  /** "Writing it down…" stays on screen at least this long so the shimmer reads as a beat, not a flash. */
  writingMinMs: 1100,
};

/** The review screen reveals five fields at 300 + 450·i ms once the listing has arrived. */
export const reviewTimings = {
  firstStepMs: 300,
  stepGapMs: 450,
  steps: 5,
};

export const LANG_LABELS: Record<string, string> = { ar: "Arabic", he: "Hebrew", en: "English" };

/** Right-to-left script in the text itself (Arabic, Hebrew, Persian, Urdu), whatever the settings say. */
export function isRtlText(s: string) {
  return /[֐-׿؀-ۿݐ-ݿࢠ-ࣿיִ-﷿ﹰ-﻿]/.test(s);
}

/** Best guess at the language of typed text from its script; falls back to the seller's setting. */
export function guessLang(s: string, fallback: string) {
  if (/[֐-׿]/.test(s)) return "he";
  if (/[؀-ۿݐ-ݿ]/.test(s)) return "ar";
  if (/[A-Za-z]/.test(s)) return "en";
  return fallback;
}

/** 0:07, 1:02 */
export function clock(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
