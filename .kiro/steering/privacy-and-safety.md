# Privacy and Safety — TrickHunt

## Core commitment

User-submitted content is never stored, logged, or forwarded to a third party
in raw form. This is a hard constraint, not a preference.

One narrow exception exists: the optional link lookup of `link-reputation-check`
(data flow rule 6). It sends only a 4-byte hash prefix of each link, never the
message and never the full link, and only after the user ticks a box for that
one scan.

## What "user content" means

Anything the user provides as input:

- Pasted text or messages
- URLs typed or extracted from text
- Uploaded images or screenshots
- QR code images

## Data flow rules

1. **OCR and QR decoding run in the browser.** Tesseract.js and zxing-wasm operate
   entirely client-side. Raw image bytes never leave the device.

2. **Only derived signals reach the server.** The tRPC layer may receive
   extracted text or a decoded URL for LLM-assisted signal generation, but
   never the original image or file.

3. **The server does not persist anything.** No database writes, no log lines
   containing user input, no caching of submitted content. Route Handlers are
   stateless and treat each request as ephemeral.

4. **The LLM receives the minimum necessary context.** Prompts sent to the LLM
   API contain the extracted text or URL only — no user identifiers, no session
   data, no metadata that could link a request to a person.

5. **No analytics on content.** Product analytics (if added) may track
   aggregate events (e.g. "scan performed", risk level bucket) but MUST NOT
   include any user-submitted text or derived content.

6. **Link reputation lookup (the only exception to forwarding).** The server may
   ask one third-party reputation list (Google Safe Browsing, `hashes.search`)
   whether a link is on its list of reported sites. This is allowed only when
   all four conditions hold:
   1. The user ticked the unticked consent box for that one scan. Consent is
      never stored and never carried to the next scan.
   2. Only the first 4 bytes of the SHA-256 of each URL expression leave the
      server. The message, the image, the full link, its path and query, and
      any user identifier are never sent. Full hashes are compared on our server.
   3. The call is made from the server. The API key is read only in
      `src/server/reputation/reputation-config.ts` and never reaches the browser.
   4. Nothing is stored, cached or logged: no link, expression, hash or
      provider response.
   A link that is not listed is never called safe.

## Risk level language

| Level | What to say | What never to say |
|---|---|---|
| `no_signals` | "Nothing detected yet" | "Safe", "Clean", "No threats found" |
| `suspicious` | "A few things to double-check" | "Probably fine", "Likely safe" |
| `high` | "Multiple warning signs — be cautious" | "Dangerous" (without evidence) |
| `critical` | "Strong indicators of a scam" | "100% a scam", "Definitely malicious" |
| any level, lookup ran, nothing listed | "Not found on the lists we checked" and "New and unreported links are not on any list yet" | "Safe", "Clean", "Verified", "No threats found" |
| any level, link listed | "may be on a list of reported sites kept by Google", with "Advisory provided by Google" | "Malicious", "Dangerous", "Fake" as a fact |

Every displayed risk level MUST be accompanied by at least one piece of evidence.
Verdicts without evidence MUST NOT be shown to users.

## What the LLM may and may not do

| Allowed | Not allowed |
|---|---|
| Generate a plain-English explanation of detected signals | Produce a final risk score |
| Suggest a next action based on the risk level | Access the internet or external tools |
| Identify additional semantic signals from extracted text | Retain or reference prior conversations |

The deterministic aggregator always owns the score. The LLM is a signal
contributor and explanation generator only.

## Dependency hygiene

- Browser-side packages (Tesseract.js, zxing-wasm) MUST be pinned to exact versions.
- Any new dependency that makes outbound network requests from the browser
  requires explicit justification before it is added.
- Server-side code MUST NOT import browser-only packages, and vice versa.
- The reputation adapter in `src/server/reputation/` uses the platform `fetch`
  and adds no dependency. Its only outbound host is `safebrowsing.googleapis.com`.
  Any other host needs a spec change.
- Browser code never calls a reputation service. The only network request from
  the browser stays the same-origin POST to `/api/analyze`.
