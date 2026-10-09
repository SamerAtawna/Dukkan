# Dukkan

A shop for people who will never build a website, sold to AI shopping agents instead of to human browsers, with PayPal doing the money.

The seller makes crafts, food or clothing at home, is on a phone, and may not read English well. They add a product by taking a photo and recording a voice note in their own language. AI writes the English listing. AI shopping agents search the catalogue, build a cart and pay through PayPal. The seller only checks, confirms and ships.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/).

## What is real

| Piece | How |
| --- | --- |
| Voice note → transcript | Browser `MediaRecorder` → `POST /api/transcribe` → Gemini reads the audio |
| Transcript + photos → English listing | `POST /api/listing` → Claude, structured output. Anything the AI inferred is kept apart as "Added by AI" |
| Agent-facing catalogue | `GET /api/catalog?q=` and `GET /api/catalog/[id]`. Every query is logged so the seller sees what agents wanted |
| Cart → PayPal order | `POST /api/checkout` → PayPal Orders v2 `create` (sandbox), order id carried as `custom_id` |
| Buyer pays | `/pay/[id]` renders the PayPal JS SDK v6 button; on approval `POST /api/checkout/[id]/capture` captures the order and records buyer name and shipping address |
| Seller ships | `PATCH /api/orders/[id]` marks shipped and pushes the tracking number to PayPal (`/v2/checkout/orders/{id}/track`) |
| Demo buyer agent | `/agent` is a Claude agent with three tools (search, product, checkout). It talks to Dukkan only over the public API, as Perplexity or Copilot would |
| Seller assistant | The "Ask or tell Dukkan" bar on the home screen. Speak (same microphone as `/add`) or type, in any language. Questions go to `POST /api/assistant`, a Claude agent with tools over the seller's own data (today, orders, agent searches, products, open/close). When the seller describes something they make, it hands the words to the add-product flow instead |
| Data | Supabase Postgres, accessed only from route handlers with the secret key |

Nothing on the seller side is simulated any more. The home screen polls the real feed; the count rolls and the coin drops when a real payment is captured.

## Run it

Requirements: Node 24, a PayPal developer account, a Supabase project, an Anthropic key and a Gemini key.

1. **Install**

   ```bash
   cd dukkan-web
   npm install
   cp .env.example .env.local
   ```

2. **PayPal sandbox.** At [developer.paypal.com](https://developer.paypal.com/dashboard/applications/sandbox) create a REST app. Put its client id and secret in `.env.local` as `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and the client id again as `NEXT_PUBLIC_PAYPAL_CLIENT_ID`. Under *Sandbox accounts* note the personal (buyer) account's login; you pay with it in the demo. Optionally set `PAYPAL_MERCHANT_EMAIL` to the business account's email so it shows on the settings screen.

3. **Supabase.** Create a project, open the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). From *Settings → API Keys* copy the project URL and the secret key (`sb_secret_…`) into `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

4. **AI keys.** `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com), `GEMINI_API_KEY` from [aistudio.google.com](https://aistudio.google.com).

5. **Seed and start**

   ```bash
   npm run seed     # Salma Crafts: 3 products, 2 past orders, a week of agent searches
   npm run dev      # http://localhost:3000
   ```

## Try the whole loop

1. Open the seller app at `http://localhost:3000`. Leave it open; it polls.
2. Open the buyer agent at `http://localhost:3000/agent` in another window. Ask for an embroidered cushion. Confirm the purchase. The agent returns a pay link.
3. Open the pay link, click the PayPal button, log in with the sandbox *personal* account and pay.
4. Back in the seller app the count rolls 2 → 3, the coin drops, and "Order paid" slides into Latest. Open it, add a tracking number, and the tracking is pushed to PayPal.
5. Add a product: `/add`, tap the mic, describe something in Arabic, Hebrew or English. Review the English listing, answer the stock question, publish. Ask the agent for it.
6. Back on the home screen, use the "Ask or tell Dukkan" bar: ask "what did agents look for this week?" and the answer streams in from the real data. Then tell it about a product in your own words ("عندي صابون زيت زيتون، ٦ دولار، عندي ٢٠ قطعة") and it opens the add flow with your words as the voice note.

Any other agent can do what the demo agent does: `curl "http://localhost:3000/api/catalog?q=cushion"` then `POST /api/checkout` with `{ "items": [{ "productId": "cushion-cover", "qty": 1 }] }`.

## Hosting it

The seller app has one seller and no accounts, so on a public deployment set `SELLER_TOKEN` to a long random string and sign in the seller's browser once at `/unlock` (the key goes in a POST body and the cookie holds only a value derived from it). Without the cookie, the seller routes answer 401; the catalogue, checkout, pay page and demo agent stay public. Pay links carry their own secret (`/pay/<id>?t=...`), so an order id alone reveals nothing. Locally, leave `SELLER_TOKEN` empty.

## Demo flags

`/?demo=paid` replays the paid beat without a payment. `/add?stage=idle|recording|writing|done|error|type`, `/orders?empty=1`, `/orders/[id]?stepChanged=1`, `/pay/[id]?t=…&demo=paid` (replays the buyer's paid moment on an unpaid cart; nothing is charged or captured).

## Checks

```bash
npm run typecheck
npx eslint src scripts
npm run build
```

## Scope notes

One seller per deployment: the app's PayPal sandbox app is the seller's account, and "Connect PayPal" on onboarding verifies those credentials with a real OAuth call. A multi-seller Dukkan would onboard each seller through PayPal's Partner Referrals API. Payment approval stays with the human buyer, as it does in Perplexity and Copilot today; the agent builds the cart and hands over the PayPal link.

Design source of truth is in `../dukkan-design/design/` (one HTML file per screen). Licence: MIT, see the repository root.
