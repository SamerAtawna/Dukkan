# Dukkan

A shop for people who will never build a website, sold to AI shopping agents instead of to human browsers, with PayPal doing the money.

The seller makes crafts, food or clothing at home, is on a phone, and may not read English well. They add a product by taking a photo and recording a voice note in their own language. AI writes the English listing. AI shopping agents search the catalogue, build a cart and pay through PayPal. The seller only checks, confirms and ships.

**Try it now:** https://dukkan-eight.vercel.app (seller app) and https://dukkan-eight.vercel.app/agent (demo buyer agent). Everything runs on the PayPal sandbox; no real money moves. See [Try the hosted demo](#try-the-hosted-demo) for the sandbox buyer login.

## What is real

| Piece | How |
| --- | --- |
| Voice note → transcript | Browser `MediaRecorder` → `POST /api/transcribe` → Gemini reads the audio |
| Transcript + photos → English listing | `POST /api/listing` → Claude, structured output. Anything the AI inferred is kept apart as "Added by AI" |
| Agent-facing catalogue | `GET /api/catalog?q=` and `GET /api/catalog/[id]`. Every query is logged so the seller sees what agents wanted |
| Seller connects PayPal | Onboarding's "Connect PayPal" is Log in with PayPal: the seller signs in on PayPal's own page, `/api/paypal/callback` reads the account's email and id, and every order names that account as the payee. Dukkan never sees a PayPal password |
| Cart → PayPal order | `POST /api/checkout` → PayPal Orders v2 `createOrder` through the official [PayPal Server SDK](https://www.npmjs.com/package/@paypal/paypal-server-sdk) (sandbox), our order id carried as `custom_id` |
| Buyer pays | `/pay/[id]` renders the PayPal JS SDK v6 button; on approval `POST /api/checkout/[id]/capture` captures the order (Server SDK `captureOrder`, idempotent with `PayPal-Request-Id`) and records buyer name and shipping address |
| Seller ships | `PATCH /api/orders/[id]` marks shipped and pushes the tracking number to PayPal (Server SDK `createOrderTracking`, Orders v2 `/track`) |
| Seller refunds | Before shipping, "Refund the buyer" on the order does a full refund through the Payments API (Server SDK `refundCapturedPayment`, idempotent per capture); the order closes as refunded and the item goes back into stock |
| Demo buyer agent | `/agent` is a Claude agent with three tools (search, product, checkout). It talks to Dukkan only over the public API, as Perplexity or Copilot would |
| Seller assistant | The "Ask or tell Dukkan" bar on the home screen. Speak (same microphone as `/add`) or type, in any language. Questions go to `POST /api/assistant`, a Claude agent with tools over the seller's own data (today, orders, agent searches, products, open/close). When the seller describes something they make, it hands the words to the add-product flow instead |
| Data | Supabase Postgres, accessed only from route handlers with the secret key |

Nothing on the seller side is simulated any more. The home screen polls the real feed; the count rolls and the coin drops when a real payment is captured.

## Try the hosted demo

The hosted app is open on purpose so anyone can try the seller side without a key.

1. Open https://dukkan-eight.vercel.app (the seller app; it polls for new orders).
2. In another window open https://dukkan-eight.vercel.app/agent, ask for an embroidered cushion and confirm. The agent returns a pay link.
3. Open the pay link, click the PayPal button and log in with this **sandbox buyer** account (a PayPal sandbox test account, not a real one):

   - Email: `sb-e6an153115349@personal.example.com`
   - Password: `6hKS@r)I`

4. Back in the seller app the order appears as paid. Open it and add a tracking number; it is pushed to PayPal.
5. To see the seller's side of PayPal, open https://dukkan-eight.vercel.app/onboarding/paypal, press **Disconnect PayPal** if it shows connected, then **Connect PayPal** and sign in on PayPal's page with the **sandbox seller** account:

   - Email: `sb-mh543b53260758@business.example.com`
   - Password: `ED^B6fzU`

   Orders then pay that account. Please connect this account rather than another one: refunds and tracking are only tested for it.

Any PayPal sandbox *personal* account works too, if you have your own.

## Agent API

The public API that shopping agents use is described in OpenAPI 3.0: [`public/openapi.yaml`](public/openapi.yaml), served at [`/openapi.yaml`](https://dukkan-eight.vercel.app/openapi.yaml). No key is needed.

| Call | What it does |
| --- | --- |
| `GET /api/catalog?q=` | Search products. Send `X-Agent: <your agent's name>`; the seller sees every query, including what the shop does not sell |
| `GET /api/catalog/{id}` | One product, with photo URLs |
| `POST /api/checkout` | Turn a cart into a PayPal order. Returns `payUrl`, the page with the PayPal button, for the buyer |
| `GET /api/checkout/{orderId}?t=` | Poll whether the buyer has paid (`t` is the token in `payUrl`) |

Payment always stays with the human: an agent builds the cart and hands over the link, it never pays by itself.

## AI tools used

| Tool | Where |
| --- | --- |
| Claude (`claude-opus-5-5`, Anthropic API) | Writes the English listing from the transcript and photos (structured output); runs the demo buyer agent and the seller assistant (tool use, streamed) |
| Gemini (`gemini-3.8-flash`) | Transcribes the seller's voice note, in Arabic, Hebrew or English |
| [APIMatic Context Plugin for PayPal](https://github.com/paypaldev/server-sdk-context-plugin-preview) | Used in Claude Code to build the server-side PayPal integration on the PayPal Server SDK: Orders (create, capture, tracking) and Payments (refunds). Its skills flagged three SDK defaults that we override in `src/lib/server/paypal.ts`: no request timeout, retries off, and a failed token fetch that is cached for the life of the client |

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

The public demo above runs without `SELLER_TOKEN` so anyone can get in. For a real shop: the seller app has one seller and no accounts, so on a public deployment set `SELLER_TOKEN` to a long random string and sign in the seller's browser once at `/unlock` (the key goes in a POST body and the cookie holds only a value derived from it). Without the cookie, the seller routes answer 401; the catalogue, checkout, pay page and demo agent stay public. Pay links carry their own secret (`/pay/<id>?t=...`), so an order id alone reveals nothing. Locally, leave `SELLER_TOKEN` empty.

## Demo flags

`/?demo=paid` replays the paid beat without a payment. `/add?stage=idle|recording|writing|done|error|type`, `/orders?empty=1`, `/orders/[id]?stepChanged=1`, `/pay/[id]?t=…&demo=paid` (replays the buyer's paid moment on an unpaid cart; nothing is charged or captured).

## Checks

```bash
npm run typecheck
npx eslint src scripts
npm run build
```

## Scope notes

One seller per deployment. The seller connects their own PayPal account with Log in with PayPal, and orders pay that account. Refunds and tracking are tested for the sandbox seller account that owns the PayPal app; for a seller who is not the app owner, PayPal would also need that seller to grant third-party permissions (or Partner Referrals onboarding), which this demo does not do. Log in with PayPal only returns to the registered `https` URL, so the connect step is tried on the hosted app, not on localhost. Payment approval stays with the human buyer, as it does in Perplexity and Copilot today; the agent builds the cart and hands over the PayPal link.

Licence: MIT, see [`LICENSE`](LICENSE).
