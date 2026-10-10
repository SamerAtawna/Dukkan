# Dukkan demo video plan

Working notes for the 3-minute hackathon video. Recorded with Screen Studio, assembled in CapCut, AI intro generated with Kling.

## Opening sentence

> Dukkan lets someone who sells crafts from home, on a phone, in their own language, open a shop that AI shopping agents can search and buy from, with PayPal moving the money.

Shorter alternatives:

- Dukkan is a shop you set up with a photo and a voice note, sold to AI shopping agents, paid through PayPal.
- Dukkan: a seller speaks, AI writes the listing, shopping agents buy, PayPal pays.

## Structure (3:00 max)

| Time | Segment | Source |
| --- | --- | --- |
| 0:00–0:10 | Title card and the opening sentence | Keynote slide |
| 0:10–0:16 | Salma at her desk, camera pushes in until her monitor fills the frame, ends on black | Kling clip A |
| 0:16–1:40 | Seller demo: onboarding, Connect PayPal (Log in with PayPal), add product by voice, review English listing with "Added by AI", publish | Screen Studio |
| 1:40–1:55 | Pull out of her monitor, through her window, over the city at night, into the buyer's window, push into his monitor, ends on black | Kling clip B (15 s multi-shot) + clip C |
| 1:55–2:50 | Agent demo: `/agent` searches, builds cart, returns pay link, PayPal button, sandbox buyer pays; cut to seller app: count rolls, coin drops, open order, add tracking (pushed to PayPal), flash the Refund button | Screen Studio |
| 2:50–3:00 | Closing line, `openapi.yaml`, live URL | Keynote slide |

Decisions made:

- No earth zoom. Both ends of the transit are a screen, so a city flight is enough and saves time.
- The "Ask or tell Dukkan" assistant bar is cut for time. Trade it against the Log in with PayPal beat if wanted.
- Seller demo recorded at desktop width, since Salma's clip ends on a desktop monitor.

## Narration script (~400 words)

**Intro.** Dukkan lets someone who sells crafts from home, on a phone, in their own language, open a shop that AI shopping agents can search and buy from, with PayPal moving the money.

**The seller.** This is Salma. She makes cushions, is on a phone, and will never build a website. This is her whole shop. She only checks, confirms and ships.

**Add a product.** To add a product she takes a photo and records a voice note in her own language. Gemini transcribes it, Claude writes the English listing, and anything the AI guessed is kept apart so she can check it. She answers one stock question and publishes.

**An agent buys.** Her buyers are not people browsing. They are AI agents. This one talks to Dukkan only through the public API, the same way Perplexity or Copilot would. It searches the catalogue, builds a cart, and asks PayPal to create the order. The agent never pays by itself. It hands the human a pay link, and the human approves on PayPal's own button.

**Money lands.** Back on Salma's screen the payment is captured and the order appears. No refresh, no dashboard. The coin drops.

**Seller ships.** She opens the order and adds a tracking number. Dukkan pushes it to PayPal's order tracking. If something goes wrong before shipping, one tap refunds the buyer through the Payments API and puts the item back in stock.

**Seller owns the account.** Every payment goes to Salma's own PayPal. She connected it with Log in with PayPal, so Dukkan never saw a password.

**Outro.** Any agent can do what you just saw. The API is public, documented in OpenAPI, and live at dukkan-eight.vercel.app. Dukkan: a seller speaks, AI writes the listing, agents buy, PayPal pays.

## Screen Studio

- Record each segment separately, 1920x1080 region, not a window. 16:9 to match the AI clips.
- Auto zoom on at reduced intensity. Manual zooms on "Added by AI", the PayPal button, the tracking field.
- Smooth cursor and click highlights on. Hide cursor in intro and the home screen pass.
- Record narration last, over the assembled cut.
- Prep: `npm run seed`, sandbox buyer already logged into PayPal in a separate Chrome profile, sandbox seller connected on the onboarding page, bookmarks bar hidden, Do Not Disturb on, one dry run of the buy loop.
- Fallback flags if a live capture misbehaves: `/?demo=paid`, `/pay/[id]?t=…&demo=paid`.

## Cinematic intro: how the joins work

Every AI clip starts or ends on a black monitor filling the whole frame. That black frame is the cut to the screen recording.

- Into a demo: AI clip ends on black. Screen recording starts at 115 % scale and black, fades in and eases to 100 % over half a second.
- Out of a demo: reverse it. Last half second eases up to 115 % and fades to black.
- Whoosh sound on each window pass.

Three generations, with the two stills as exact join points:

1. **Clip A**: Salma still → push in to black. Done. Played reversed it also gives the pull-out.
2. **Clip B**: flight, start frame Salma still, end frame buyer still, 15 s custom multi-shot.
3. **Clip C**: buyer still → push in to black.

Timeline order: intro, A, seller recording, A reversed, B, C, agent recording, outro.

### Stills (image generator)

Both over-the-shoulder so the front of the monitor is visible. "Facing the camera" alone made the model show the back of the monitor.

Salma:

```
Cinematic photograph, 16:9, over-the-shoulder shot. The camera is positioned behind and slightly to the right of a woman in her forties, so we see the back of her head and shoulder in the foreground, out of focus, and the front of her desktop monitor in sharp focus in the center of the frame. The monitor screen is plain black and unlit. Beyond the monitor is a small home craft workshop with shelves of handmade cushions, folded fabric and spools of thread, and a large window to the left showing city rooftops at dusk. Warm lamp light, shallow depth of field, 35mm lens, documentary realism, no text, no logos.
```

Buyer (window to the side of the desk so the camera can enter without swinging around him):

```
Cinematic photograph, 16:9, over-the-shoulder shot. The camera is behind and slightly to the left of a man in his thirties, so we see the back of his head and shoulder in the foreground, out of focus, and the front of his desktop monitor in sharp focus in the center of the frame. The monitor screen is plain black and unlit. Beyond the desk is a modern apartment at night with a large window to the side showing city lights. Soft lamp light, shallow depth of field, 35mm lens, documentary realism, no text, no logos.
```

### Clip A / Clip C (push-in, single shot, 5 s, start frame only)

```
Over-the-shoulder shot, camera behind the person. Slow steady dolly forward past the shoulder, straight toward the front of the monitor, until the black screen fills the entire frame. The screen surface stays flat and facing the camera the whole time. Continuous single shot, no cuts, no text on screen. Ends on solid black.
```

### Clip B (flight, 15 s, Custom Multi-Shot, 4 shots, start + end frame)

```
Shot 1, 3 s: Camera pulls back from the woman at her desk and turns toward the large window beside her. Smooth dolly, warm lamp light.

Shot 2, 4 s: Camera flies out through the open window and climbs over a glowing city at night, rooftops and streets below, motion blur, accelerating.

Shot 3, 4 s: Camera dives from above the city toward one lit apartment window, decelerating as it gets close.

Shot 4, 4 s: Camera passes through the window glass into a modern apartment and settles behind a man seated at his desk, looking over his shoulder at his monitor. Slow, steady, ends still.
```

Overall prompt: one continuous camera move, cinematic, photoreal, no cuts, no text on screen.

If the take stops outside the buyer's window: use Kling's "Extract Frame" on the last good frame, then generate a 5 s bridge with that frame as start and the buyer still as end:

```
Camera moves forward through the lit window glass into the apartment, slows down, and settles behind a man seated at his desk, looking over his shoulder at his monitor. Smooth continuous dolly, decelerating, cinematic, photoreal, no cuts, no text on screen.
```

Or shift time inside the multi-shot: shot 3 down to 3 s, shot 4 up to 5 s.

## Kling (kling.ai) how-to

- Creative Studio → Video Generation. Model VIDEO 3.0. No Native Audio. 1080p, 16:9.
- "Add start and end frames" box in the top left of the panel is the image-to-video input. Start slot = Salma still, end slot = buyer still.
- Multi-Shot switch on → "Custom Multi-Shot" → 4 shots with the durations and prompts above.
- Bottom bar "1080p · 6s · 16:9 · 1" → set length to 15 s.
- Skip "Bind Subject"; characters are seen from behind.
- Credits, No Native Audio: 8 per second at 1080p, 6 at 720p. 15 s flight ≈ 120 credits at 1080p; 5 s push-in ≈ 40. Free daily balance is 66, so the flight needs a paid plan. Buy the tier above the cheapest, turn off auto-renew.
- Run early flight attempts at 720p, final one at 1080p.

## Status

- Done: opening sentence, timeline, script, Salma still, clip A, a first flight take (stopped outside the buyer's window, needs the bridge or re-timed multi-shot).
- Pending: buyer still, clip B keeper, clip C, both Screen Studio recordings, Keynote slides, CapCut assembly, narration.
- Claude in Chrome can drive Kling but needs the Kling window it opened to be signed in (bottom-left shows "Sign In" while signed out) and the two stills shared into the chat.
