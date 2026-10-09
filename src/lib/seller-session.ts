/**
 * Seller session helpers shared by the proxy and the unlock route (Web Crypto only, no Node APIs).
 * The cookie never holds SELLER_TOKEN itself, only an HMAC derived from it.
 */

export const SELLER_COOKIE = "dukkan_seller";

const enc = new TextEncoder();

/** HMAC-SHA256(token, label) as hex: what the seller cookie carries. */
export async function deriveSession(token: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(token), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("dukkan-seller-session-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
