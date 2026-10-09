import { badRequest, handler, json } from "@/lib/server/http";
import { gemini, GEMINI_MODEL, LANG_NAMES } from "@/lib/server/ai";

const MAX_BYTES = 15 * 1024 * 1024;
/** Recordings shorter than this never contain a product description; skip the model. */
const MIN_BYTES = 2000;

/**
 * POST /api/transcribe (multipart: audio=<blob>, lang=ar|he|en)
 * The seller's voice note, in their language, written down verbatim. Gemini reads the audio directly.
 */
export const POST = handler(async (req: Request) => {
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) throw badRequest("Send the recording as form field `audio`");
  if (audio.size > MAX_BYTES) throw badRequest("Recording is too large (15 MB max)");
  const langHint = String(form?.get("lang") ?? "");
  if (audio.size < MIN_BYTES) return json({ transcript: "", language: langHint || "und", empty: true });
  const langName = LANG_NAMES[langHint] ?? "the language spoken";
  const mimeType = (audio.type || "audio/webm").split(";")[0];
  const data = Buffer.from(await audio.arrayBuffer()).toString("base64");

  const res = await gemini().models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data } },
          {
            text:
              `First decide whether this audio contains clear human speech. Silence, noise, breathing, or a few unclear syllables are NOT speech. ` +
              `If there is no clear speech, return {"speech": false, "transcript": "", "language": "${langHint || "und"}"} and nothing else. Never guess or invent words. ` +
              `If there is speech, transcribe it exactly as spoken, in ${langName}, using that language's own script. ` +
              `It is a seller describing a product they make (what it is, material, size, colours, price, how many). ` +
              `Keep numbers as the speaker said them. Do not translate, summarise or add anything. ` +
              `Return JSON: {"speech": true, "transcript": string, "language": ISO 639-1 code of the spoken language}.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: { speech: { type: "boolean" }, transcript: { type: "string" }, language: { type: "string" } },
        required: ["speech", "transcript", "language"],
      },
      temperature: 0,
    },
  });

  let parsed: { speech?: boolean; transcript?: string; language?: string } = {};
  try {
    parsed = JSON.parse(res.text ?? "{}");
  } catch {
    parsed = { transcript: res.text ?? "", language: langHint };
  }
  const transcript = parsed.speech === false ? "" : (parsed.transcript ?? "").trim();
  return json({ transcript, language: parsed.language || langHint || "und", empty: transcript.length === 0 });
});
