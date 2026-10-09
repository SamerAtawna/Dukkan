import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { claude, CLAUDE_MODEL, LANG_NAMES } from "@/lib/server/ai";
import { handler, json, parseBody } from "@/lib/server/http";
import { getShop } from "@/lib/server/store";

const Body = z.object({
  transcript: z.string().min(1).max(4000),
  lang: z.string().max(10).optional(),
  /** Data URLs (image/jpeg, image/png, image/webp) of the seller's photos. */
  photos: z.array(z.string().max(2_000_000)).max(4).optional(),
});

/** What the AI writes. Everything the seller did not say goes in `aiAdded`, never in the other fields. */
const Listing = z.object({
  title: z.string().describe("English product title, 3 to 9 words, no marketing fluff"),
  shortTitle: z.string().describe("1 or 2 words for a small label, e.g. 'Cushion cover'"),
  price: z.number().nullable().describe("Price in USD if the seller said one, else null"),
  details: z.array(z.string()).describe("3 to 5 short chips: material, size, colours, set size. Only what was said or clearly visible."),
  description: z.string().describe("One or two plain English sentences a buyer's agent can match against. Only facts the seller gave or the photos show."),
  aiAdded: z
    .string()
    .nullable()
    .describe("One sentence of helpful context the seller did NOT say and the photos do not show (origin, maker, use). Null if nothing worth adding."),
  question: z
    .object({
      kind: z.enum(["stock", "price", "size", "other"]),
      text: z.string().describe("The one question to the seller, in English, short"),
      quick: z.array(z.number()).describe("Up to 3 quick numeric answers for stock or price questions; empty otherwise"),
    })
    .nullable()
    .describe("The single most important thing missing (usually how many they have). Null if nothing is missing."),
  stock: z.number().nullable().describe("How many the seller said they have, else null"),
  art: z.enum(["cushion", "spoons", "rug", "generic"]).describe("Closest placeholder artwork for the product"),
});

export type ListingDraft = z.infer<typeof Listing>;

/**
 * POST /api/listing: transcript (+ photos) in the seller's language → English listing.
 * Streams nothing; the review screen reveals the fields one by one once it arrives.
 */
export const POST = handler(async (req: Request) => {
  const body = await parseBody(req, Body);
  const shop = await getShop();
  const langName = LANG_NAMES[body.lang ?? ""] ?? "their language";

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const url of body.photos ?? []) {
    const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(url);
    if (!m) continue;
    content.push({ type: "image", source: { type: "base64", media_type: m[1] as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: m[2] } });
  }
  content.push({
    type: "text",
    text:
      `The seller of "${shop.name}" described a product in ${langName}. Their words, verbatim:\n\n` +
      `"""${body.transcript}"""\n\n` +
      `Write the English listing. Rules:\n` +
      `- Translate faithfully. Keep every fact they gave (material, size, colours, price, quantity). Convert spelled-out or non-Latin numerals to digits.\n` +
      `- Do not invent facts in title, details or description. Anything you add that they did not say and the photos do not show goes only in aiAdded, as one sentence, or is left out.\n` +
      `- If they did not say how many they have, ask that in question (kind "stock", quick [1, 5, 10]). If they gave no price, ask for the price instead (kind "price", quick []). Otherwise ask the next most useful thing, or null.\n` +
      `- Plain, concrete English. Buyers' AI agents will search this text.`,
  });

  const res = await claude().beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(Listing) },
    system:
      "You write product listings for a tiny shop whose products are sold to AI shopping agents. " +
      "You are precise, never embellish, and keep the seller's facts separate from your own additions.",
    messages: [{ role: "user", content }],
  });

  if (res.stop_reason === "refusal" || !res.parsed_output) {
    return json({ error: "Could not write the listing from that recording", code: "NO_LISTING" }, { status: 422 });
  }
  const draft = res.parsed_output;
  return json({ ...draft, transcript: body.transcript, lang: body.lang ?? null });
});
