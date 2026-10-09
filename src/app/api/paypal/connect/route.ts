import { handler, json } from "@/lib/server/http";
import { verifyCredentials } from "@/lib/server/paypal";
import { updateShop } from "@/lib/server/store";

/**
 * POST /api/paypal/connect: "Connect PayPal" on onboarding.
 *
 * One seller, one PayPal business account: the app's sandbox credentials ARE the seller's
 * account, so connecting means proving they work (a real OAuth call) and recording the
 * account on the shop. A multi-seller Dukkan would use PayPal's partner onboarding
 * (Partner Referrals API) here instead; see README.
 */
export const POST = handler(async () => {
  const ok = await verifyCredentials();
  const email = process.env.PAYPAL_MERCHANT_EMAIL?.trim() || "sandbox business account";
  const shop = await updateShop({ paypalEmail: ok ? email : null, onboarded: true });
  return json({ connected: ok, email: shop.paypalEmail, env: process.env.PAYPAL_ENV === "live" ? "live" : "sandbox" });
});
