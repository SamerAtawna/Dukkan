import { NextResponse, type NextRequest } from "next/server";
import { deriveSession, safeEqual, SELLER_COOKIE } from "@/lib/seller-session";

/**
 * POST /api/unlock { key }: signs this browser in as the seller for 30 days.
 * The key travels in the body (never a URL) and the cookie holds a derived value, not the key.
 * Only meaningful when SELLER_TOKEN is set; otherwise the app is already open.
 */
export async function POST(req: NextRequest) {
  const token = process.env.SELLER_TOKEN;
  if (!token) return NextResponse.json({ ok: true, open: true });
  const body = (await req.json().catch(() => ({}))) as { key?: unknown };
  const key = typeof body.key === "string" ? body.key.trim() : "";
  if (!safeEqual(key, token)) return NextResponse.json({ error: "Wrong key", code: "UNAUTHORIZED" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SELLER_COOKIE, await deriveSession(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

/** DELETE /api/unlock: sign out. */
export function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SELLER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
