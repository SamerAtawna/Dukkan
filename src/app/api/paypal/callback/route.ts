import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { appUrl } from "@/lib/server/http";
import { PAYPAL_STATE_COOKIE, PayPalError, sellerFromCode } from "@/lib/server/paypal";
import { connectPayPal } from "@/lib/server/store";

/**
 * GET /api/paypal/callback: PayPal sends the seller back here after they sign in. Check the state,
 * read who they are, make that account the one orders pay, and return to onboarding, which plays
 * the "Connected" flip. Failures go back to the same screen with a reason, never a raw error page.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const back = (result: "connected" | "cancelled" | "error", reason?: string) => {
    const q = new URLSearchParams({ paypal: result });
    if (reason) q.set("reason", reason.slice(0, 160));
    return Response.redirect(appUrl(req, `/onboarding/paypal?${q}`), 302);
  };

  const jar = await cookies();
  const expected = jar.get(PAYPAL_STATE_COOKIE)?.value;
  jar.delete({ name: PAYPAL_STATE_COOKIE, path: "/api/paypal" });

  if (params.get("error")) return back("cancelled");
  const code = params.get("code");
  if (!code) return back("error", "PayPal returned without a sign-in code");
  if (!expected || params.get("state") !== expected) return back("error", "sign-in state did not match");

  try {
    await connectPayPal(await sellerFromCode(code));
    return back("connected");
  } catch (err) {
    unstable_rethrow(err);
    console.error("[paypal connect]", err);
    // Only PayPal's short error description reaches the URL; full bodies stay in the server log.
    const reason =
      err instanceof PayPalError
        ? `${err.message} (${err.status}${err.code ? `: ${err.code}` : ""})`
        : err instanceof Error
          ? err.message
          : "";
    return back("error", reason);
  }
}
