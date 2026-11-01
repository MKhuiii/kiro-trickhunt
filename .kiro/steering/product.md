# Product — TrickHunt

## What it is

TrickHunt is a web app that helps everyday users check suspicious messages,
links, screenshots, and QR codes, understand *why* something looks like a scam,
and know what to do next.

Each scam type is personified as a monster. The Halloween theme makes different
scam patterns memorable without being condescending.

## Three design principles

1. **No absolute safety claims.** Every result shows a risk level with evidence.
   The word "safe" never appears as a verdict.

2. **The LLM does not decide.** The risk score comes from a deterministic
   noisy-or aggregator. The LLM only contributes semantic signals and generates
   the plain-English explanation. Results are testable and explainable.

3. **Privacy by default.** Nothing the user submits is stored. Ever.

## MVP input types

| Input | How it works |
|---|---|
| Text / message | Pasted directly into the text box |
| URL | Entered or extracted from pasted text |
| Screenshot / image | Uploaded; OCR runs in the browser |
| QR code | Uploaded; decoded in the browser |

Phone call transcripts are a future extension — users can paste them into the
text box in the meantime.

## Users

**Elderly / less tech-savvy.** Receives "bank account locked, click link".
Needs large text, simple language, and one clear next action.

**Young professional.** Receives a suspiciously easy high-pay job offer.
Needs to see the specific warning signs so they can spot similar scams
independently in future.

**Family helper.** Gets a screenshot from a parent. Uploads it, gets a quick
verdict, advises their relative accurately.

## What "done" looks like for a feature

- Accessible at all font sizes (no fixed-pixel font sizes on user-facing text)
- Explanation written at a reading level suitable for a non-technical adult
- Risk level always shown with at least one piece of evidence
- No network request carries raw user content to a third-party service
