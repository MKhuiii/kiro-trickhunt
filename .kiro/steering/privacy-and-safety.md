# Privacy and Safety — TrickHunt

## Core commitment

User-submitted content is never stored, logged, or forwarded to a third party
in raw form. This is a hard constraint, not a preference.

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

## Risk level language

| Level | What to say | What never to say |
|---|---|---|
| `no_signals` | "Nothing detected yet" | "Safe", "Clean", "No threats found" |
| `suspicious` | "Some warning signs present" | "Probably fine", "Likely safe" |
| `high` | "Multiple warning signs — be cautious" | "Dangerous" (without evidence) |
| `critical` | "Strong indicators of a scam" | "100% a scam", "Definitely malicious" |

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
