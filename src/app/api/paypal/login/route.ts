import { cookies } from "next/headers";
import { appUrl, handler } from "@/lib/server/http";
import { PAYPAL_STATE_COOKIE, sellerLoginUrl } from "@/lib/server/paypal";

/**
 * GET /api/paypal/login: "Connect PayPal" in onboarding. Sends the seller to PayPal's own sign-in
 * page (Log in with PayPal); PayPal returns them to /api/paypal/callback. The one-time state in an
 * HttpOnly cookie ties the callback to this browser. Seller-only (proxy matcher).
 */
export const GET = handler(async (req: Request) => {
  const state = crypto.randomUUID();
  (await cookies()).set(PAYPAL_STATE_COOKIE, state, {
    httpOnly: true,
    secure: appUrl(req, "").startsWith("https:"),
    sameSite: "lax",
    path: "/api/paypal",
    maxAge: 600,
  });
  return Response.redirect(sellerLoginUrl(appUrl(req, "/api/paypal/callback"), state), 302);
});
