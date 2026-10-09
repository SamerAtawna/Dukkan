import { NextResponse, type NextRequest } from "next/server";
import { deriveSession, safeEqual, SELLER_COOKIE } from "@/lib/seller-session";

/**
 * Seller routes need the seller. There is one seller per deployment and no accounts, so the
 * gate is a shared secret: set SELLER_TOKEN in the environment, then sign in once at /unlock
 * on the seller's device (an HttpOnly cookie holding a value derived from the token).
 * API clients may send `Authorization: Bearer <SELLER_TOKEN>` instead. The catalogue, checkout,
 * pay page and demo agent stay public. With SELLER_TOKEN unset (local dev) everything is open.
 * Seller pages without a session redirect to /unlock (then back); seller API calls get a 401.
 */
export async function proxy(req: NextRequest) {
  const token = process.env.SELLER_TOKEN;
  if (!token) return NextResponse.next();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (safeEqual(bearer, token)) return NextResponse.next();
  const cookie = req.cookies.get(SELLER_COOKIE)?.value;
  if (cookie && safeEqual(cookie, await deriveSession(token))) return NextResponse.next();
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    const unlock = new URL("/unlock", req.url);
    unlock.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(unlock);
  }
  return NextResponse.json({ error: "Seller sign-in required", code: "UNAUTHORIZED" }, { status: 401 });
}

export const config = {
  matcher: [
    // Seller pages (redirect to /unlock)
    "/",
    "/add/:path*",
    "/orders/:path*",
    "/products/:path*",
    "/searches",
    "/settings",
    "/onboarding/:path*",
    // Seller API (401)
    "/api/orders/:path*",
    "/api/products/:path*",
    "/api/shop",
    "/api/home",
    "/api/searches",
    "/api/paypal/:path*",
    "/api/transcribe",
    "/api/listing",
    "/api/assistant",
  ],
};
