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
| 0:00–0:10 | Kling intro: title text assembles from lime particles (5 s), then the title dissolves into Salma's workshop (5 s) | Kling intro clips 1 + 2 |
| 0:10–0:16 | Salma at her desk, camera pushes in until her monitor fills the frame, ends on black | Kling clip A |
| 0:16–1:45 | Seller demo: onboarding, Connect PayPal (Log in with PayPal), add product by voice, review English listing with "Added by AI", publish | Screen Studio |
| 1:45–1:55 | Pull out of her monitor (A reversed at 2x, ~2.5 s), through her window, over the city at night, into the buyer's shop window (B, 5 s), push into her monitor, ends on black (C trimmed to its last ~2.5 s) | Kling clips A, B, C |
| 1:55–2:50 | Agent demo: `/agent` searches, builds cart, returns pay link, PayPal button, sandbox buyer pays; cut to seller app: count rolls, coin drops, open order, add tracking (pushed to PayPal), flash the Refund button | Screen Studio |
| 2:50–3:00 | Closing line, `openapi.yaml`, live URL | Keynote slide |

Decisions made:

- No earth zoom. Both ends of the transit are a screen, so a city flight is enough and saves time.
- Decided 10 Oct 2026: the flight (clip B) is 5 s, a single shot with start and end frames, not the 15 s multi-shot. The whole transit (A reversed, B, C) is about 10 s. The 15 s version put 25 s of no product on screen.
- The "Ask or tell Dukkan" assistant bar is cut for time. Trade it against the Log in with PayPal beat if wanted.
- Seller demo recorded at desktop width, since Salma's clip ends on a desktop monitor.

## Narration script (~400 words; the ElevenLabs-ready version is in `narration.md`)

**Intro.** Dukkan lets someone who sells crafts from home, on a phone, in their own language, open a shop that AI shopping agents can search and buy from, with PayPal moving the money.

**The seller.** This is Salma. She makes cushions, is on a phone, and will never build a website. This is her whole shop. She only checks, confirms and ships.

**Add a product.** To add a product she takes a photo and records a voice note in her own language. Gemini transcribes it, Claude writes the English listing, and anything the AI guessed is kept apart so she can check it. She answers one stock question and publishes.

**The flight to the buyer (over clip B).** Now leave Salma's shop. Across the city, in an apartment she will never see, someone wants a cushion. He is not going to browse for it. He asks his AI agent.

**An agent buys.** That agent talks to Dukkan only through the public API, the same way Perplexity or Copilot would. It searches the catalogue, builds a cart, and asks PayPal to create the order. The agent never pays by itself. It hands him a pay link, and he approves on PayPal's own button.

**Money lands.** Back on Salma's screen the payment is captured and the order appears. No refresh, no dashboard. The coin drops.

**Seller ships.** She opens the order and adds a tracking number. Dukkan pushes it to PayPal's order tracking. If something goes wrong before shipping, one tap refunds the buyer through the Payments API and puts the item back in stock.

**Seller owns the account.** Every payment goes to Salma's own PayPal. She connected it with Log in with PayPal, so Dukkan never saw a password.

**Outro.** Any agent can do what you just saw. The API is public, documented in OpenAPI, and live at dukkan-eight.vercel.app. Dukkan: a seller speaks, AI writes the listing, agents buy, PayPal pays.

## Intro (Kling, decided 10 Oct 2026)

Two clips, both VIDEO 3.0, 1080p, 16:9, no native audio, Multi-Shot off:

1. **Title card still** (Image 3.0, 2K, 16:9, 2 credits): `Minimal cinematic title card, 16:9, pure near-black background with a faint soft vignette. Centered typography only: the word "Dukkan" large in a bold modern geometric sans-serif, bright lime green, and directly below it the sentence "A shop that AI agents buy from." in a clean white sans-serif, smaller, perfectly spelled, crisp edges, subtle glow, lots of empty space, no other text, no logos, no icons, no people, no objects.` Both outputs were spelled correctly; keeper is the one with the larger type.
2. **Intro clip 1, text entrance** (5 s, 40 credits): start frame = solid black image, end frame = title card. Keeper on the first take. Prompt: `Elegant cinematic title animation on a pure black background, one continuous shot. Out of the darkness, fine drifting lime green light particles gather and sweep across the centre of the frame, and the letters of the title assemble from them one by one, glowing softly, until the large lime green word and the smaller white sentence below it are fully formed, perfectly sharp and legible, exactly matching the end frame. The particles fade and the finished title holds still for the final second. Smooth, premium, minimal, no camera movement, no extra words, no other objects.`
3. **Intro clip 2, title into workshop** (5 s, 40 credits, the user's pick on 10 Oct 2026): start frame = title card, end frame = Salma keeper still. Prompt: `Cinematic title sequence, one continuous shot. The title card holds still for the first two seconds: the lime green word and the white sentence stay perfectly legible, crisp and unchanged, with a slow subtle glow pulsing through the letters and a few faint light particles drifting behind them. Then the letters gently dissolve into drifting light particles and the darkness opens up, revealing a warm craft workshop at dusk behind them, the camera settling behind a woman seated at her desk, looking over her shoulder at her switched-off monitor, exactly matching the end frame. Smooth, elegant, no camera shake, no new text, no extra words.` Two other takes exist in the history and can be deleted: one with the wrong Salma still (submitted by mistake) and a 10 s slow-crossfade version that was tried for a softer transition but not preferred.

In the edit: intro clip 1 (text entrance, ends on the title card) cuts straight into intro clip 2 (starts on the same title card), then clip A. Trim the hold on the title card between them if it feels long.

Note: an end frame without a start frame drops Kling to VIDEO 1.6, so always give a start frame (a black image works) to stay on 3.0.

## Screen Studio

- Record each segment separately, 1920x1080 region, not a window. 16:9 to match the AI clips.
- Auto zoom on at reduced intensity. Manual zooms on "Added by AI", the PayPal button, the tracking field.
- Smooth cursor and click highlights on. Hide cursor in intro and the home screen pass.
- Record narration last, over the assembled cut.
- Prep: `npm run seed`, sandbox buyer already logged into PayPal in a separate Chrome profile, sandbox seller connected on the onboarding page, bookmarks bar hidden, Do Not Disturb on, one dry run of the buy loop.
- Fallback flags if a live capture misbehaves: `/?demo=paid`, `/pay/[id]?t=…&demo=paid`.

## Cinematic intro: how the joins work

Decided 10 Oct 2026: the push-ins end on the real interface, not on black. Clip A's monitor lights up with the onboarding welcome page (`/onboarding/welcome` at 1920x1080, shop name "Sam Craft", English selected) and the page fills the frame on the last frame; clip C does the same with the empty `/agent` page. Kling did this from a start frame plus the page screenshot as the end frame (prompt below). So:

- Into a demo: straight cut from the AI clip's last frame to the recording's first frame. The recording must start on exactly that page in that state, so open the URL fresh at 1920x1080 and press record before touching anything.
- The end frames were uploaded letterboxed (2.25:1 with the 16:9 page centred), so the last half second of each push-in has thin black bars at the sides. In CapCut, keyframe Scale from 100 % to 126 % over that last half second (or crop to 16:9 content); the bars leave the frame and the cut to the recording is seamless.
- Out of the seller demo: last half second eases up to 115 % and fades to black, then clip A reversed (black-end version) pulls out. Or reverse the UI version of clip A, which pulls out of the live welcome page; try both in the edit.
- Whoosh sound on each window pass.

Push-in-to-interface prompt (start frame = still, end frame = page screenshot, Multi-Shot off, no native audio):

```
Over-the-shoulder shot, camera behind the woman. Slow steady dolly forward past her shoulder, straight toward the front of the monitor. As the camera approaches, the monitor switches on and shows the exact web page from the end frame, crisp and undistorted, with no reflections. The camera keeps moving until the bezel leaves the frame and the web page fills the whole frame, ending exactly on the end frame. Continuous single shot, no cuts.
```

The UI is soft for the middle second or two while the camera moves, which reads as motion blur, and is pixel-sharp on the final frame.

Three generations, with the two stills as exact join points:

1. **Clip A**: Salma still → push in to black. Done. Played reversed it also gives the pull-out.
2. **Clip B**: flight, start frame Salma still, end frame buyer still, 5 s single shot.
3. **Clip C**: buyer still → push in to black.

Timeline order: intro, A, seller recording, A reversed, B, C, agent recording, outro.

### Stills (image generator)

Both over-the-shoulder so the front of the monitor is visible. "Facing the camera" alone made the model show the back of the monitor.

Salma (regenerated 10 Oct 2026 in the current Kling account; keeper is `kling_20261010_IMAGE_Cinematic _4582_0`, the take with the clean black screen and the big window on the left):

```
Cinematic photograph, 16:9, over-the-shoulder shot. The camera is positioned behind and slightly to the right of a woman in her forties, so we see the back of her head and shoulder in the foreground, out of focus, and the front of her desktop monitor in sharp focus in the center of the frame. The monitor screen is plain black and unlit. Beyond the monitor is a small home craft workshop with shelves of handmade cushions, folded fabric and spools of thread, and a large window to the left showing city rooftops at dusk. Warm lamp light, shallow depth of field, 35mm lens, documentary realism, no text, no logos.
```

Buyer (decided 10 Oct 2026: a woman who owns a small boutique, at the PC on her shop counter; the shop window is to the side so the camera can enter without swinging around her):

```
Cinematic photograph, 16:9, over-the-shoulder shot. The camera is behind and slightly to the left of a woman in her thirties, the owner of a small boutique shop, seated at the counter in front of her desktop computer, so we see the back of her head and shoulder in the foreground, out of focus, and the front of her desktop monitor in sharp focus in the center of the frame. The monitor screen is plain black and unlit. Beyond the counter is her small retail store at night after closing: shelves and racks of home decor and cushions, a few hanging pendant lights, and a large shop window to the side showing a city street with lights. Soft warm light, shallow depth of field, 35mm lens, documentary realism, no text, no logos.
```

Keeper: Kling asset `kling_20261010_IMAGE_Cinematic _4481_1` (IMAGE 3.0, 2K, 16:9), generated 10 Oct 2026 12:35.

### Clip A / Clip C (push-in, single shot, 5 s, start frame only)

```
Over-the-shoulder shot, camera behind the person. Slow steady dolly forward past the shoulder, straight toward the front of the monitor, until the black screen fills the entire frame. The screen surface stays flat and facing the camera the whole time. Continuous single shot, no cuts, no text on screen. Ends on solid black.
```

Learned on clip C (10 Oct 2026): with a start frame only, VIDEO 3.0 treats the black screen as glossy and renders the woman's face and the lamps reflected in it, and the bezel is still in shot on the last frame. Two prompt rewrites did not fix it. What fixed it was a solid black 16:9 image in the **end frame** slot plus this prompt (take 3 is the keeper, ends on true black, no reflection):

```
Over-the-shoulder shot, camera behind the woman. Slow steady dolly forward past her shoulder, straight toward the front of the switched-off monitor. Its screen is matte, pure black and empty, with no reflections, no faces and no lights on it. The camera keeps moving until the bezel leaves the frame and the black screen fills the whole frame, ending exactly on the solid black end frame. Continuous single shot, no cuts, no text on screen.
```

If clip A has the same reflection problem, redo it the same way.

### Clip B (flight, 5 s, single shot, start + end frame)

Start frame Salma still, end frame buyer still, Multi-Shot off.

```
One continuous camera move, no cuts. The camera pulls back fast from the woman at her desk, swings toward the large window beside her and flies out through it, racing over a glowing city at night with rooftops and streets below, motion blur, then dives toward a lit shop window at street level, passes through the glass into a small boutique full of cushions and settles behind a woman seated at the counter, looking over her shoulder at her black monitor. Fast in the middle, slow and steady at both ends, cinematic, photoreal, no text on screen.
```

The old 15 s four-shot version is kept below in case 5 s turns out too compressed (blurry middle, or it never reaches the shop):

```
Shot 1, 3 s: Camera pulls back from the woman at her desk and turns toward the large window beside her. Smooth dolly, warm lamp light.

Shot 2, 4 s: Camera flies out through the open window and climbs over a glowing city at night, rooftops and streets below, motion blur, accelerating.

Shot 3, 4 s: Camera dives from above the city toward one lit shop window at street level, decelerating as it gets close.

Shot 4, 4 s: Camera passes through the shop window glass into a small boutique full of cushions and settles behind a woman seated at the counter, looking over her shoulder at her monitor. Slow, steady, ends still.
```

If the take stops outside the buyer's window: use Kling's "Extract Frame" on the last good frame, then generate a 5 s bridge with that frame as start and the buyer still as end:

```
Camera moves forward through the lit shop window glass into the boutique, slows down, and settles behind a woman seated at the counter, looking over her shoulder at her monitor. Smooth continuous dolly, decelerating, cinematic, photoreal, no cuts, no text on screen.
```

Or shift time inside the multi-shot: shot 3 down to 3 s, shot 4 up to 5 s.

## Kling (kling.ai) how-to

- Creative Studio → Video Generation. Model VIDEO 3.0. No Native Audio. 1080p, 16:9.
- "Add start and end frames" box in the top left of the panel is the image-to-video input. Start slot = Salma still, end slot = buyer still.
- Multi-Shot stays off for the 5 s flight. Bottom bar "1080p · 5s · 16:9 · 1".
- Skip "Bind Subject"; characters are seen from behind.
- Credits, No Native Audio: 8 per second at 1080p, 6 at 720p. 5 s flight or push-in ≈ 40 credits at 1080p, 30 at 720p. Standard plan (660/month) since 10 Oct 2026.
- Run early flight attempts at 720p, final one at 1080p.
- Claude in Chrome: `find`/`read_page` are permission-denied on kling.ai, so drive it by screenshot coordinates. The end-frame slot accepts a drag-and-drop image (`upload_image` with the slot's coordinates); a black end frame can be made by blanking any page with JavaScript and screenshotting it. Generations submitted while on the free tier stayed queued after subscribing until the page was reloaded.

## Status

- Done: opening sentence, timeline, script.
- Done 10 Oct 2026, all in the current Kling account (Google sign-in, Standard plan), all VIDEO 3.0, 1080p, 5 s, no native audio, 40 credits each, under Assets → Creatives:
  - Salma still (regenerated; the original and the old clip A were in another account and were abandoned).
  - Buyer still (woman shop owner).
  - Clip A: two keepers. (1) Salma still → black end frame. (2) Salma still → onboarding welcome page, the one to use for the cut into the seller demo.
  - Clip B: Salma still → buyer still, 5 s single shot, the prompt above. One take, keeper: out through the workshop window, city flyover, blurred street-level pass through the shop window, settles behind the buyer on the last frame.
  - Clip C: two keepers. (1) buyer still → black end frame, take 3 (takes 1 and 2 show her face reflected in the screen, delete them). (2) buyer still → agent page, the one to use for the cut into the agent demo.
- Credits left after all of it: about 248 (after the intro clips).
- Done 10 Oct 2026: CapCut assembly (2:13, no URL slide, ends on the title card), narration and soundtrack (see `narration.md`). Published: https://youtu.be/6Bud7XoxLNA
- Claude in Chrome can drive Kling but needs the Kling window it opened to be signed in (bottom-left shows "Sign In" while signed out) and the two stills shared into the chat.
