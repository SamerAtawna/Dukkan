# Demo narration (Gemini TTS)

Timed to the CapCut export `1010(1)(1).mp4` (2:13, silent audio track). Published video: https://youtu.be/6Bud7XoxLNA Timestamps are where each line should start; every line has slack before the next cut. About 290 words, roughly 2.3 words per second, so the narrator can take a normal pace. Numbers are spelled out for the voice model.

What is on screen at each cut, for reference:

| Time | On screen |
| --- | --- |
| 0:00 | Title assembles from particles, dissolves into Salma's workshop |
| 0:08 | Onboarding: shop name typed, language picked |
| 0:16 | Get paid with PayPal, Log in with PayPal, "Connected" at 0:30 |
| 0:32 | "Your shop is open", home page: "2 AI agents are inside your shop" |
| 0:40 | Add a product: photo, voice note, transcript "I want to sell a lion pillow for twenty dollars" |
| 0:54 | Listing written in English, stock question, Publish, "Putting it in your shop" |
| 1:08 | Pull out of Salma's monitor, flight over the city, into the buyer's boutique |
| 1:14 | Agent page: "Hi I am looking for a pillow", pillow found, "yes i want 1 please", order created with pay link |
| 1:28 | Pay Salma Crafts, PayPal popup, "Paid. Thank you." |
| 1:34 | Pull out of the buyer's monitor, flight back, into Salma's monitor |
| 1:42 | Orders: To ship 1, Order 1051 paid with PayPal, "Refund the buyer" link visible |
| 1:50 | Add tracking number, Mark as shipped, "buyer notified" |
| 2:00 | Home: 1 order, twenty dollars paid, "3 AI agents are inside your shop" |
| 2:04 | Pull out of the monitor, black, title card |

```
[0:00 Title]
Dukkan. A shop that AI agents buy from.

[0:06 Salma at her desk, into onboarding]
This is Salma. She makes cushions. She is never going to build a website. This is her whole shop.

[0:12 Shop name and language]
She names her shop, and picks the language she speaks.

[0:17 Connect PayPal]
Then she connects her own PayPal account, with Log in with PayPal. Dukkan never sees a password. Every payment goes straight to her.

[0:31 Connected, shop opens]
Connected. Her shop is open. And before she has listed a single thing, two AI agents are already inside, looking around.

[0:41 Add a product]
To add a product, she picks a photo, and just talks. In any language she likes.

[0:50 Transcript, Write my listing]
Gemini transcribes her words. Claude writes the English listing.

[0:56 The listing, stock question, publish]
Title, price, details, description. One question about stock, and she publishes.

[1:03 Putting it in your shop]
That is her whole job.

[1:08 Flight to the buyer]
Now leave Salma's shop. Across the city, a shop owner wants a pillow. She won't browse for it. She asks her AI agent.

[1:16 The agent searches and orders]
The agent talks to Dukkan only through its public API. It searches the shop, finds the pillow, and asks PayPal to create the order.

[1:26 Pay link and PayPal button]
The agent never pays by itself. It hands over a link, and the buyer approves on PayPal's own button.

[1:33 Paid, flight back]
Paid. And the money is already on its way to Salma.

[1:42 Orders]
Back on Salma's screen, the order is already there. Paid through PayPal, by an agent, on behalf of a buyer. She only has to ship it.

[1:50 Tracking number]
She adds a tracking number and marks it shipped. The buyer's agent hears about it the same second.

[1:56 Refund, over the shipped order]
And if anything goes wrong, one tap refunds the buyer.

[2:00 Home]
One order. Twenty dollars paid. Three agents inside her shop.

[2:05 Outro, over the pull-out and title card]
Any agent can do what you just saw. The API is public and live today. Dukkan. A shop that AI agents buy from.
```

Notes for the voice pass:

- The cut has no URL slide, so the address is not spoken. If a Keynote end card is added, append "dukkan dash eight dot vercel dot app" to the outro.
- The refund is only a link on the order page (1:46 to 1:48), never clicked, so the refund line is kept to one short sentence.
- The buyer in the stills is a woman, so the buyer is "she" and Salma is named each time the script returns to her.
- The onboarding welcome page is what appears inside the monitor on both push-ins (1:08 and 1:40). Nothing in the narration refers to it.

Generating the audio: `GEMINI_API_KEY=... python3 scripts/narration-tts.py` (model `gemini-3.8-flash-tts`, voice Charon). It writes one WAV per segment plus `narration_full.wav`, a 2:13 track with each clip at its timestamp, into `~/Movies/CapCut/dukkan-narration/`. Clips already on disk are reused; delete a clip (or set `REGEN=1`) to regenerate it. Do not put style directions in the text, the model reads them aloud. Generated 10 Oct 2026: every clip fits its slot within about a second; the assembler nudges a clip later only when the previous one is still playing, and prints each nudge.

## Music and sound effects

`python3 scripts/demo-audio-mix.py` builds the soundtrack into the same folder:

- `music_lyria_a.mp3`, `music_lyria_b.mp3`: two 3-minute instrumental beds from Lyria 3.5 (same key, `lyria-3.5:generateContent`, prompt: warm minimal electronic, soft piano, light synth bass, brushed percussion, no vocals). B has the steadier dynamics and is the default; pass A as the second argument to swap.
- `music_bed.wav`: the chosen bed trimmed to 2:13, 1.5 s fade in, 4 s fade out, ducked 8 dB whenever the narration speaks (envelope derived from `narration_full.wav`, 60 ms attack, 800 ms release).
- `sfx_track.wav`: synthesized effects (`sfx/`, made with numpy) placed at the cuts: riser and hit on both title builds, whooshes on every monitor pull-out, window pass and push-in (68.2, 70.6, 71.9, 73.6, 94.4, 96.3, 97.5, 99.0, 123.8 s), chime on PayPal connected (29.5), pop on publish (61.8), coin on "Paid. Thank you." (91.0), ding when the order shows on the Orders page (102.3), chime on marked as shipped (113.8). Times and gains are the `cues` list in the script.
- `final_mix.wav`: narration + bed + effects. `preview_final.mp4`: the video with the final mix, for checking sync.

Drop the three stems onto separate CapCut tracks at zero if you want to rebalance them there, or use `final_mix.wav` as a single track. To swap any effect for a CapCut library sound, mute it in `cues` and place the library sound at the same time.
