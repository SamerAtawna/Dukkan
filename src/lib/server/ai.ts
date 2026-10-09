import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { ConfigError } from "@/lib/server/db";

/** Claude writes listings and runs the demo buyer agent. Gemini transcribes the voice note. */

export const CLAUDE_MODEL = "claude-opus-5-5";
export const GEMINI_MODEL = "gemini-3.8-flash";

let anthropic: Anthropic | undefined;
export function claude(): Anthropic {
  if (anthropic) return anthropic;
  if (!process.env.ANTHROPIC_API_KEY) throw new ConfigError("ANTHROPIC_API_KEY must be set in .env.local");
  anthropic = new Anthropic();
  return anthropic;
}

let google: GoogleGenAI | undefined;
export function gemini(): GoogleGenAI {
  if (google) return google;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ConfigError("GEMINI_API_KEY must be set in .env.local");
  google = new GoogleGenAI({ apiKey });
  return google;
}

export const LANG_NAMES: Record<string, string> = { ar: "Arabic", he: "Hebrew", en: "English" };
