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

**Duration.** The route sets `maxDuration = 15` seconds. Your hosting plan may cap this lower. If the cap is below about 10 seconds, the platform could cut a slow LLM call before the pipeline's own timeout.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
