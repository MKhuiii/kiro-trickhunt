This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## LLM Smoke Test

TrickHunt can use an OpenAI-compatible LLM to add semantic signals. To check that your provider settings work:

1. Copy `.env.example` to `.env` and fill in your own values (key, model, base URL). Never commit `.env`.
2. Run the smoke script:

```bash
npx tsx --env-file=.env scripts/smoke-llm.ts
```

**Warning:** this makes one real request to the configured provider. The request uses a fixed, harmless sample text, not user content. It may use a small amount of your provider quota.

The script prints only a status, an optional reason and signal ids. It never prints the sample, the raw response or your key.

If the key, model or base URL is missing or invalid, the app runs rules-only, without an LLM. In that case the script prints `rules-only (no LLM configured)`. This is a normal state, not an error.

To switch provider, change the environment variables in `.env` (`LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`). No code changes are needed.

## Analyze API

`POST /api/analyze` checks a message and/or links and returns a `Verdict` (risk level, evidence signals, next actions). Nothing you send is stored or logged. The only log line per request is a fixed event with status, duration and semantic mode.

### Request

Send `Content-Type: application/json` (parameters such as `charset` are allowed). The body is strict: unknown keys are rejected.

| Field | Type | Limit |
|---|---|---|
| `text` | string, optional | at most 4000 characters |
| `urls` | string[], optional | at most 10 items, each at most 2048 characters |
| `locale` | string, optional | exactly `"vi"` or `"en"` |
| `checkLinks` | boolean, optional | `true` or `false` (see [Link reputation check](#link-reputation-check)) |

At least one non-blank `text` or a non-empty `urls` is required. A body with only `locale` is rejected.

`locale` chooses the language of `actions` and `limitations` in the verdict. Any other value or type (for example `"fr"`, `"VI"`, `""`, `null` or a number) gives `400 invalid-input`. When `locale` is absent, the pipeline default language is used.

```json
{
  "text": "Your bank account is locked. Verify now at the link below.",
  "urls": ["http://example.com/verify"],
  "locale": "en"
}
```

### Response

A `200` returns the pipeline `Verdict` and a `meta` object. Field names in `verdict` follow the `Verdict` type in `src/pipeline/verdict.ts`; the example is shortened.

```json
{
  "verdict": {
    "riskScore": 72,
    "level": "high",
    "monster": "bank",
    "signals": [],
    "actions": [],
    "limitations": [],
    "semantic": { "status": "ok", "skipped": false },
    "inputTruncated": false,
    "urlsAnalyzed": 1,
    "urlsSkipped": 0
  },
  "meta": { "semanticMode": "used" }
}
```

`meta.semanticMode` tells you how the LLM was handled:

- `used`: an LLM is configured and the pipeline really called it. It does not promise the LLM answered successfully; see `verdict.semantic` for that.
- `budget-exhausted`: an LLM is configured, the pipeline tried to call it, and the call budget was spent. You still get a rule-based verdict.
- `not-configured`: no LLM is configured. You get a rule-based verdict.
- `skipped`: an LLM is configured, but the pipeline never called it (for example, only URLs were sent, the text was blank, or the rules already found a critical level). No budget is used.

**Lazy budget.** The LLM budget is spent only when the LLM is really called, not at the start of a request. Requests that never reach the LLM do not use up the quota.

### Errors

Errors always have the body `{ "error": { "code": "<code>" } }` with no message or details.

| Status | Code | Cause |
|---|---|---|
| 400 | `invalid-input` | Bad JSON or UTF-8, unknown keys, wrong types, `locale` other than `"vi"` or `"en"`, limits exceeded, or no text and no URLs |
| 413 | `payload-too-large` | Body larger than 150 KiB (declared or actual) |
| 415 | `invalid-content-type` | Not `application/json` |
| 429 | `rate-limited` | Too many requests; see the `Retry-After` header (seconds) |
| 500 | `internal-error` | Any unexpected failure |

Other methods get `405` from Next.js. Every response carries `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. No CORS headers are sent, so other origins cannot read responses from a browser.

### Example (PowerShell)

```powershell
$body = @{
  text = "Your bank account is locked. Verify now at the link below."
  urls = @("http://example.com/verify")
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/analyze" `
  -ContentType "application/json" -Body $body
```

### Limits

| Setting | Default | Bounds | Scope |
|---|---|---|---|
| `RATE_LIMIT_PER_MINUTE` | 10 | 1 to 600 | requests per client per minute |
| `LLM_CALLS_PER_MINUTE` | 4 | 0 to 60 | LLM calls per minute, all clients |
| `LLM_CALLS_PER_DAY` | 200 | 0 to 10000 | LLM calls per 24 hours, all clients |

Set these in `.env` (see `.env.example`). Missing or invalid values fall back to the default; out-of-range values are clamped. A value of `0` for an LLM limit turns the LLM off (`budget-exhausted` whenever the pipeline would call it). Body and field size limits are fixed constants, not settings.

**Best effort only.** The rate limiter and the LLM budget live in memory, per server instance. On serverless platforms each warm instance has its own counters, and a cold start resets them, so the real total can be higher than the configured numbers. The client is identified by the first `x-forwarded-for` entry, which is only trustworthy behind a proxy that sets it (Vercel does). Keep the LLM defaults below your provider quota; the provider limit is the final backstop.

**Rules-only fallback.** If the LLM is not configured, the budget is spent, or the provider fails or times out, the API still answers with the rule-based verdict. This is a normal state, not an error.

**Duration.** The route sets `maxDuration = 20` seconds. Your hosting plan may cap this lower. If the cap is below about 10 seconds, the platform could cut a slow LLM call before the pipeline's own timeout.

## Link reputation check

An optional lookup asks Google Safe Browsing whether a link is on its list of reported sites. It runs automatically when a scan contains a link and a key is configured.

### When it runs

The browser asks for the lookup automatically whenever a scan contains a link. There is no consent box. The request is never stored and never carried to the next scan. Without a link, or without a configured key, no lookup is made.

### Data sent

Only the first 4 bytes of the SHA-256 hash of each link expression leave the server (Safe Browsing `hashes.search`). The message, the image, the full link, its path and query, and any user identifier are never sent. The server compares full hashes itself. The call is made from the server, and the API key never reaches the browser. Nothing is stored, cached or logged: no link, expression, hash or provider response. The only outbound host is `safebrowsing.googleapis.com`.

### Not listed is not safe

A link that is not on the list is not called safe. New and unreported links are not on any list yet. The result says "Not found on the lists we checked", never "safe". A listed link "may be on a list of reported sites kept by Google" and is shown with "Advisory provided by Google". A listing can raise the risk level to at least `high`.

### Request field and response mode

Send `"checkLinks": true` in the `POST /api/analyze` body to ask for the lookup. The browser sends it automatically when the input has a link. `meta.reputationMode` reports what happened:

| `reputationMode` | Meaning |
|---|---|
| `checked` | The lookup ran for the links. |
| `not-requested` | `checkLinks` was not `true`. No lookup was made. |
| `not-configured` | `LINK_REPUTATION_API_KEY` is missing or blank. The verdict is rule-based only. |
| `budget-exhausted` | The per-minute or per-day lookup limit is spent, or a limit is `0`. |
| `skipped` | The lookup was asked for but had nothing to check (no links were analyzed). |
| `failed` | The lookup was tried but the provider failed or timed out. The verdict is still returned. |

### Settings

Set these in `.env` (see `.env.example`). They are read on the server only. Missing or invalid values fall back to the default, and out-of-range values are clamped.

| Variable | Default | Bounds | Purpose |
|---|---|---|---|
| `LINK_REPUTATION_API_KEY` | none | n/a | Safe Browsing key. Optional. The lookup is off when it is missing. |
| `LINK_REPUTATION_TIMEOUT_MS` | 3000 | 500 to 6000 | Provider timeout in milliseconds. |
| `LINK_REPUTATION_CALLS_PER_MINUTE` | 10 | 0 to 60 | Lookups per minute per instance. `0` turns the lookup off. |
| `LINK_REPUTATION_CALLS_PER_DAY` | 2000 | 0 to 10000 | Lookups per 24 hours per instance. `0` turns the lookup off. |

### Non-commercial use

The Safe Browsing API is free for non-commercial use only. Keep TrickHunt non-commercial, or switch to Google Web Risk. Google does not guarantee the accuracy or reliability of the list.

## Image and QR input (browser)

TrickHunt can read a screenshot or a QR code image. All image work happens in your browser. Code lives in `src/client/ingest/`.

### What runs where

| Where | What |
|---|---|
| Browser | Decode the file, redraw it through a canvas (drops metadata, downscales), read the QR code with [`zxing-wasm`](https://www.npmjs.com/package/zxing-wasm), and run OCR with [`tesseract.js`](https://www.npmjs.com/package/tesseract.js) in Vietnamese and English (`vie`, `eng`) |
| Server | `POST /api/analyze` whose body carries `text`, `urls` and an optional `locale` (`"vi"` or `"en"`), never image data (see [Analyze API](#analyze-api)) |

### Privacy

- Images never leave the browser. The only network call is the same-origin `POST /api/analyze`, and its body never contains image data.
- Only `http` and `https` URLs from a QR code are forwarded. Other QR payloads (Wi-Fi, payment, contact, anything else) are never sent to the server.
- Nothing is saved in `localStorage`, `sessionStorage` or IndexedDB.

### Limits and caveats

- **One QR code per image.** Only the first valid QR code is read.
- **OCR is not exact.** Blurry, small or low-contrast text, and text that mixes scripts, may be misread or missed. The result is a hint, not a transcript.
- **Formats:** PNG, JPEG and WebP.
- **Size limits:** 10 MiB per file, 2400 px on the longest side (larger images are scaled down), and at most 50 MP decoded.
- Client text and URL limits equal the server limits (a test checks this).

### Self-hosted assets

The OCR worker, OCR engine, language data and QR wasm are served from this app, not from a CDN. They are copied from `node_modules` into `public/tesseract/` and `public/zxing/` by `npm run prepare:assets`. The `predev` and `prebuild` scripts run it, so `npm run dev` and `npm run build` do it for you. The script skips files that already match and stops with an error if a source is missing or a hash differs. The generated folders are git-ignored.

```powershell
npm run prepare:assets
```

### First-use download

The first scan downloads the assets for the feature it uses. Sizes are gzip estimates measured locally, and your host may compress differently.

| Feature | Approx. download |
|---|---|
| OCR (worker, one engine file, `vie` and `eng` data) | 5.6 MiB |
| QR (wasm) | 0.4 MiB |

### Licenses

Licenses and sources of the shipped components are listed in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) at the repository root. License files are also copied next to the assets.

### The `/try` page

`/try` is a temporary developer page for checking this flow in a real browser. It is not linked from other pages and will be replaced by the real UI.

## Link creatures

Each suspicious trait in a link gets a small creature on the result card. For example, the Doppelganger marks a name that is very close to a well-known brand. Creatures only help you read the evidence. They never change the risk level, the score or the main monster. TrickHunt never opens, visits or tests a link, so it cannot tell whether a link exists, where it leads or whether the page behind it is genuine. It only looks at the characters of the link.

## The main monsters

Each kind of scam has one main monster. The result card shows the monster that best matches the evidence. The monster is a memory aid, not a verdict.

| Monster | Scam pattern |
|---|---|
| Bank Ghost | Fake bank or account messages that ask for a code, password or card number |
| Gift Vampire | Prizes and gifts that ask for a fee or your details |
| Job Zombie | Easy, high-pay job offers that ask for a deposit or a move to another chat app |
| Authority Banshee | Threats of arrest or fines from a supposed officer or office |
| Profit Goblin | Investment pitches that promise big profits and ask for a deposit first |
| Heart Wraith | Romance scams that build trust first and then ask for money |

## Known limits

- **Rules-only mode misses new wording.** Without the AI layer, TrickHunt checks messages against a fixed set of known warning phrases. It often misses scam wording it has not seen before. The AI layer is needed to catch those. A result of "Nothing detected yet" only means the rules found no warning signs. It is not a guarantee about the message.
- **The evaluation set is not an accuracy estimate.** The 75 sample messages (26 scam, 49 benign) were used to tune the rules. The rules were adjusted until they handled these samples well, so good results on them do not show how the rules will do on new messages.
- **Rules alone have low recall on unfamiliar wording.** The phrase rules for the Profit Goblin and Heart Wraith only catch wording close to what they already know.
- **The AI layer carries most of the detection for investment and romance scams.** Without it, many of these messages get no signal. With it, results still depend on the AI provider and are not guaranteed.
- **The 20 `nm-` samples are not an accuracy estimate.** They were used to tune the new phrases, so good results on them say little about new messages.
- **The 14 `mc-` confusion samples are not an accuracy estimate either.** They were used to tune the monster choice between similar scam types. When the AI layer returns only one warning sign, or none, the result can stay on the general monster even when the message matches a specific one. The AI layer is not deterministic, so two runs on the same message can differ.
- **Accepted recall losses: currently none.** Every scam sample in the set still reaches at least its expected risk level. Two scam samples moved from `critical` to `high`. They still meet their minimum level, so they are not counted as losses.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
