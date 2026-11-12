# Design Document

## Overview

The browser turns one image into `{ text, urls }` for the existing
`POST /api/analyze`, and nothing else leaves the device. The flow is:

1. `validateImageFile` checks type and size.
2. `prepareImage` decodes with `createImageBitmap`, downscales with `fitWithin`,
   redraws on a canvas (metadata is dropped because only pixels are copied) and
   reads `ImageData`.
3. `decodeQr` reads the QR payload from `ImageData` with `zxing-wasm`;
   `classifyQrPayload` reduces each payload to `{ kind, url? }` immediately.
4. `runOcr` recognizes the canvas with `tesseract.js` in a worker.
   `assessOcr` drops poor output.
5. `buildAnalyzeRequest` merges user text, OCR text and QR URLs into the API
   body and returns notices.
6. `analyzeRequest` posts `{ text, urls }` to `/api/analyze`.

Pure logic and adapters are separate files. Adapters take their dependencies as
parameters; `browser-deps.ts` is the only file that touches browser globals and
dynamic imports. No existing contract changes. The client only reads the shape
of the API (documented in `analyze-api`) and imports `Verdict` as a type.

Stack facts checked in this repository: Next.js 15.5.28, React 19.1.0, zod 4.6.7,
Vitest 5.0.5 (`environment: "node"`, `include: ["src/**/*.test.ts"]`), fast-check
4.10.2, `tsconfig` with `strict` and the `dom` lib. Vitest includes only `.test.ts`
files, so the page (`.tsx`) is covered by `tsc`, lint and build, not by unit tests.

## Architecture

### Module layout (`src/client/ingest/`)

- `ingest.config.ts` — all constants (import-free)
- `types.ts` — structural types (`ImageDataLike`, `CanvasLike`, notices, error codes)
- `validate-image-file.ts`, `fit-within.ts` — pure
- `qr-payload.ts` — `classifyQrPayload`, `isHttpUrl` (pure)
- `analyze-input.ts` — `buildAnalyzeRequest` (pure)
- `ocr-quality.ts` — `assessOcr` (pure)
- `prepare-image.ts`, `decode-qr.ts`, `zxing-reader.ts`, `run-ocr.ts`, `ingest-image.ts` — adapters with injected deps
- `analyze-client.ts` — the only file that calls `fetch`
- `browser-deps.ts` — real dependencies (globals, dynamic `import()`)
- `assets.manifest.json` — asset list shared by the copy script and a test
- `index.ts` — public exports
- tests next to each module; `*.property.test.ts` for PBT-47 to PBT-58;
  `limits.test.ts`, `assets.test.ts`, `boundaries.test.ts` for the guards

Outside this folder: `scripts/copy-client-assets.mjs`, `THIRD_PARTY_NOTICES.md`,
`src/app/try/page.tsx`, a README section, `.gitignore` lines and `package.json`.

### Config constants (`ingest.config.ts`)

```ts
// Equal to src/server/api/api-limits.config.ts; limits.test.ts guards it.
export const MAX_TEXT_CHARS = 4000;
export const MAX_URLS_IN = 10;
export const MAX_URL_CHARS = 2048;

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 2400;
export const MAX_SOURCE_PIXELS = 50_000_000;
export const PREPARE_TIMEOUT_MS = 15_000;

export const QR_MAX_RESULTS = 1;
export const QR_MAX_PAYLOAD_CHARS = 7089;     // largest QR capacity (numeric)
export const QR_TIMEOUT_MS = 15_000;

export const OCR_LANGUAGES = ["vie", "eng"] as const;
export const OCR_OEM = 1;                     // LSTM only
export const OCR_TIMEOUT_MS = 90_000;
export const OCR_MIN_CHARS = 10;
export const OCR_MIN_CONFIDENCE = 30;
export const SKIP_OCR_WHEN_QR_FOUND = false;

export const ANALYZE_ENDPOINT = "/api/analyze";
export const ANALYZE_TIMEOUT_MS = 20_000;     // server maxDuration is 15 s
export const DEFAULT_RETRY_AFTER_SEC = 30;
export const MAX_RETRY_AFTER_SEC = 3600;

export const WIFI_PREFIX = "WIFI:";
export const PAYMENT_PREFIXES = ["000201", "upi:", "bitcoin:", "ethereum:", "litecoin:", "monero:"] as const;
export const CONTACT_PREFIXES = ["BEGIN:VCARD", "MECARD:", "mailto:", "tel:", "sms:"] as const;

export const ASSET_PATHS = {
  ocrWorker: "/tesseract/worker.min.js",
  ocrCoreDir: "/tesseract/core",
  ocrLangDir: "/tesseract/lang",
  zxingWasm: "/zxing/zxing_reader.wasm",
} as const;
```

Rationale for the numbers that are not copied from somewhere:

- `MAX_IMAGE_BYTES` 10 MiB: phone screenshots are usually a few MB; a larger
  file is more likely a photo that will not OCR well anyway.
- `MAX_IMAGE_DIMENSION` 2400: most phone screenshots are at most about 2400 px
  on the long side, so they are not resampled. At 2400 x 2400 the RGBA
  `ImageData` is about 23 MB. Tesseract documentation notes that low-resolution
  input hurts recognition, so a smaller value would cost accuracy.
- `MAX_SOURCE_PIXELS` 50 MP: a 10 MiB JPEG can decode to hundreds of megapixels.
  `createImageBitmap` allocates the full bitmap before we can shrink it, so the
  guard runs after decoding and only prevents the second and third copies. A
  hostile image can still cost the user's own tab memory; this is a self-inflicted
  limit, not a security boundary, and is documented as such. Raise or lower it
  after trying real photos.
- `OCR_MIN_CHARS` 10 and `OCR_MIN_CONFIDENCE` 30 (Tesseract page confidence is
  0 to 100): deliberately lenient so short scam texts such as "click link now"
  pass. These values are a starting point and have not been calibrated against
  real screenshots.
- `OCR_TIMEOUT_MS` 90 s covers the first load (about 5.6 MiB of assets) on a
  slow mobile link plus recognition.
- `PAYMENT_PREFIXES`: `000201` is the EMVCo merchant-presented QR start (payload
  format indicator, used by bank QR codes such as VietQR). The scheme prefixes are
  common payment deep links. The list is not exhaustive and is meant to grow in
  config. A numeric text that happens to start with `000201` is classified as
  `payment`, which only produces a notice and exposes nothing.

### Shared types (`types.ts`)

```ts
export interface ImageDataLike { readonly data: Uint8ClampedArray; readonly width: number; readonly height: number }
export interface Context2DLike {
  drawImage(source: unknown, dx: number, dy: number, dw: number, dh: number): void;
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageDataLike;
}
export interface CanvasLike { width: number; height: number; getContext(type: "2d"): Context2DLike | null }
export interface ImageFileLike { readonly type: string; readonly size: number }
export type QrKind = "url" | "payment" | "wifi" | "contact" | "text" | "other";
export interface QrClassification { readonly kind: QrKind; readonly url?: string }
export interface AnalyzeRequest { text?: string; urls?: string[] }
```

DOM types are not used in the pure files; the real `ImageData`, canvas and
`File` are structurally assignable.

## Components and Interfaces

### Pure core

**`validateImageFile(file)`**: reads `type` and `size` inside a `try/catch` (a
hostile getter must not throw), lower-cases `type`, checks membership in
`ALLOWED_IMAGE_TYPES`, then `Number.isInteger(size) && size >= 1`, then
`size <= MAX_IMAGE_BYTES`. Returns the first failing code.

**`fitWithin(width, height, max)`**: domain is positive safe integers. Outside
it returns `{ 0, 0 }`. Otherwise `scale = min(1, max / max(width, height))` and
each side is `max(1, round(side * scale))`. Because the sides are integers and
`scale <= 1`, the result is never larger than the input, and each side is within
one pixel of `side * scale` (the "at least 1" clamp can add less than one
pixel). Non-integer sizes are not accepted on purpose: flooring a value such as
`0.5` would produce zero for a positive input, which the requirement forbids.
`HTMLImageElement` and `ImageBitmap` report integer sizes, so the domain is not
a practical limit.

**`isHttpUrl(value)`** (in `qr-payload.ts`, reused by `analyze-input.ts`): true
when `value` is a string, at most `MAX_URL_CHARS` long, free of whitespace and
control characters (`/[\s\u0000-\u001f\u007f]/`), and `new URL(value)` yields
protocol `http:` or `https:` with a non-empty `hostname`. `URL` is a standard
global in browsers and Node, so the file stays environment-agnostic.

**`classifyQrPayload(payload)`**: non-string or blank gives `other`. Otherwise
trim, then test in the fixed order of REQ-CI-07. Prefix checks lower-case both
sides. `url` returns `Object.freeze({ kind: "url", url: trimmed })`; every other
kind returns a frozen `{ kind }`. No branch copies payload text anywhere else.

**`buildAnalyzeRequest(input)`**:

1. Read `userText`, `ocrText` and `qrResults` defensively (wrong types are
   treated as absent; `qrResults` that is not an array is empty).
2. `joined = [userText.trim(), ocrText.trim()].filter(nonBlank).join("\n\n")`.
3. If `joined.length > MAX_TEXT_CHARS`, cut to `MAX_TEXT_CHARS`; if the last unit
   is a high surrogate (`0xD800`..`0xDBFF`) drop it; trim the end; mark
   `text-truncated`. If the final text is blank, omit `text`.
4. Iterate `qrResults`; keep entries that are objects with `kind === "url"` and
   `isHttpUrl(url)`; de-duplicate with a `Set`; stop at `MAX_URLS_IN`.
5. Compute the kind flags for notices from valid entries only (`kind` must be in
   the closed set).
6. `request` is `null` when neither `text` nor `urls` remains.

The function returns `{ request, notices }` rather than a bare `null`. The brief
says "returns null when there is nothing to analyze" and also wants a `wifi-qr`
notice for a Wi-Fi QR, which by itself leaves nothing to analyze. A bare `null`
would lose the notice, so `request` is the nullable part.

Server text counting: `MAX_TEXT_CHARS` counts UTF-16 units (zod `.max`), and
`String.prototype.length` also counts units, so the two agree.

**`assessOcr`**: counts non-whitespace characters with a single regex replace and
compares them with the thresholds; non-finite or non-number values mean
`too-poor`.

### Image preparation

```ts
interface DecodedImage { readonly width: number; readonly height: number; readonly source: unknown; close(): void }
interface PrepareImageDeps {
  decode(file: ImageFileLike): Promise<DecodedImage>;      // createImageBitmap(file) in the default
  createCanvas(width: number, height: number): CanvasLike | null;
}
```

Algorithm: validate; race `deps.decode(file)` against `PREPARE_TIMEOUT_MS`.
A decode that settles after the race was lost is closed in a `.then` so it
never leaks. After a decode: check width and height are finite and positive,
check `width * height <= MAX_SOURCE_PIXELS`, compute `fitWithin`, create the
canvas, get the `2d` context, `drawImage(source, 0, 0, w, h)`, then
`getImageData(0, 0, w, h)`. A `finally` block closes the bitmap exactly once.
Any failure zeroes the canvas size. The result exposes `dispose()` which zeroes
the canvas and is safe to call repeatedly.

Why a canvas redraw: it copies pixels only, so EXIF and other embedded metadata
do not reach the OCR library or `ImageData`. `createImageBitmap(file)` is called
without options in the default decoder. To my knowledge the HTML default for
`imageOrientation` is `"from-image"`, so EXIF rotation would be applied while
decoding, but I did not verify this in a browser. I avoid passing the option so
the code does not depend on which enum values a given browser accepts; the try
page is where this is checked with a rotated photo. There are no object URLs
anywhere in this path, so there is nothing to revoke.

### QR decoding

```ts
interface QrReader { read(imageData: ImageDataLike): Promise<unknown> }
interface DecodeQrDeps { loadReader(): Promise<QrReader> }
```

`decodeQr` loads the reader (failure gives `qr-engine-unavailable`), races
`reader.read(imageData)` against `QR_TIMEOUT_MS` (failure or timeout gives
`qr-decode-failed`), then filters the unknown output as in REQ-CI-28.

`zxing-reader.ts` exports `createZxingReader(lib)` where `lib` is the imported
`zxing-wasm/reader` module (`{ readBarcodes }`). It calls
`readBarcodes(imageData, { formats: ["QRCode"], maxNumberOfSymbols: QR_MAX_RESULTS, textMode: "Plain" })`
and returns the array. Option names were read from the package's type
declarations (`ReaderOptions`). `textMode` defaults to `"HRI"` (human-readable
interpretation); `"Plain"` is chosen so the payload is the raw text. In a scratch
run with `zxing-wasm` 3.1.6 both modes returned identical text for URL, Wi-Fi,
EMV, vCard and `mailto:` payloads, so `"Plain"` is a safeguard against content
types where `HRI` may rewrite the text, not a fix for an observed difference.
`maxNumberOfSymbols: 1` is the documented one-QR-per-image limit.

`browser-deps.ts` builds the default `loadReader`:

```ts
const lib = await import("zxing-wasm/reader");
lib.prepareZXingModule({
  overrides: { locateFile: (path, prefix) => path.endsWith(".wasm") ? wasmUrl : prefix + path },
});
return createZxingReader(lib);
```

The `zxing-wasm` README states that the default `.wasm` location is a jsDelivr
URL and shows `prepareZXingModule` with a `locateFile` override as the way to
change it. It also warns that `overrides` is atomic, so `locateFile` is always
included. The loader memoizes its promise per deps instance so the module is
prepared once.

### OCR execution

```ts
interface OcrWorkerLike { recognize(image: unknown): Promise<unknown>; terminate(): unknown }
interface OcrWorkerOptions {
  workerPath: string; corePath: string; langPath: string;
  workerBlobURL: false; cacheMethod: "none";
  logger(message: unknown): void; errorHandler(error: unknown): void;
}
interface OcrEngine { createWorker(langs: readonly string[], oem: number, options: OcrWorkerOptions): Promise<OcrWorkerLike> }
interface OcrDeps { loadEngine(): Promise<OcrEngine>; assetBaseUrl: string }
```

Options verified against the `tesseract.js` 7.0.0 documentation
(`docs/api.md`, `docs/local-installation.md`) and `src/index.d.ts`:

| Option | Value | Why |
|---|---|---|
| `workerPath` | `${base}/tesseract/worker.min.js` | Worker script location. |
| `corePath` | `${base}/tesseract/core` | Must be a directory. The docs strongly discourage a single `.js` file, because the library picks the best build for the device. |
| `langPath` | `${base}/tesseract/lang` | No trailing slash. Files are `langPath + "/" + code + ".traineddata.gz"`. |
| `workerBlobURL` | `false` | The default (`true`) wraps the worker in a Blob that runs `importScripts("<workerPath>")` (read from the 7.0.0 build). A relative path would not resolve against a `blob:` URL, which is my inference and not tested here, so absolute URLs are always passed. With `false` the worker loads straight from the self-hosted path. |
| `cacheMethod` | `"none"` | The default `write` stores downloaded language data in IndexedDB. Language data is not user content, but the rule is no IndexedDB, and the HTTP cache already covers repeat visits. |
| `gzip` | default `true` | The shipped files are `.traineddata.gz`. |
| `logger` | progress mapper | Receives `{ status, progress }`. |
| `errorHandler` | no-op sink | Worker errors become `ocr-failed`; their content is never kept. |

`base` is `deps.assetBaseUrl` (the page origin in the browser), so all three
paths are absolute same-origin URLs. `createWorker(["vie", "eng"], 1, options)`
uses the documented signature `createWorker(langs, oem, options, config)`; `1` is
`OEM.LSTM_ONLY`. In LSTM-only mode the library loads the `-lstm` core variants
(`tesseract-core-lstm.wasm.js`, `-simd-lstm`, `-relaxedsimd-lstm`); this was read
from the minified `worker.min.js` of 7.0.0 and is the reason only three of the
six core files are shipped.

`recognize` accepts a `canvas` element (browser only), a `File`/`Blob`, an `img`
element, a base64 string or a buffer of an encoded image. It does not accept raw
pixels, so `runOcr` passes `image.canvas`, never `imageData`. The result is
`{ data: Page }`, and `Page` has `text: string` and `confidence: number`
(`src/index.d.ts`). `runOcr` validates both with type checks.

Control flow, one `finish` function resolves the result once and sets
`finished`:

1. Start the timer (`timeoutMs`) and listen to `signal`.
2. `work()`: `loadEngine`, `createWorker`, then `register(worker)`. `register`
   records the worker; if `finished` is already true it calls `terminateOnce`
   immediately (this handles a worker created after a timeout).
3. `recognize(image.canvas)`, validate output, `finish({ ok: true, ... })`.
4. Any throw gives `finish({ ok: false, code })` where the code is
   `ocr-engine-unavailable` before the worker exists and `ocr-failed` after.
5. After `finish`, every registered worker goes through `terminateOnce`, which
   keeps a `Set`, calls `terminate()` once in a `try/catch`, and attaches
   `.catch` if it returns a promise. `terminate()` is called, not awaited, so a
   hung terminate cannot hang the result.

Progress mapping: a logger message whose `status` is `"recognizing text"` maps
to stage `recognizing`; everything else maps to `loading`. The status string is
my reading of the library's behavior and was not run in a browser here; if the
string differs, progress shows as `loading`, which is harmless.

### Ingest orchestration

```ts
interface IngestDeps { prepare: PrepareImageDeps; qr: DecodeQrDeps; ocr: OcrDeps }
```

The order is fixed: prepare, QR, then OCR. QR runs first because it is cheap and
its result can skip OCR. Each decoded payload goes straight through
`classifyQrPayload`; only the classification is stored, so a Wi-Fi password or
payment string never outlives the loop iteration. The whole body is in a
`try/catch` with a `finally` that disposes the image; an unexpected throw gives
`errorCode: "unexpected"`.

### Analyze client

```ts
interface AnalyzeClientDeps {
  fetch(input: string, init: RequestInit): Promise<ResponseLike>;
  timeoutMs?: number;
}
interface ResponseLike { status: number; headers: { get(name: string): string | null }; json(): Promise<unknown> }
```

The default deps are created inside `analyze-client.ts` (`globalThis.fetch.bind`)
so the file stays the only caller of `fetch`. The body is built from a
sanitized object: `text` only when it is a string, `urls` only when it is an
array, with non-string items dropped, then `JSON.stringify`. Extra properties on
the input, including image-like fields, never reach the body. A timer aborts an
`AbortController` and a `Promise.race` guarantees a result even if a fake or
buggy `fetch` ignores the signal.

Error mapping reads `body.error.code` and accepts it only when it is one of the
five fixed codes in `analyze-response.ts`; otherwise the status decides (400,
413, 415, 429, 500). Anything else is `unexpected-status`. For 429, `Retry-After`
must match `/^\d{1,9}$/`, then is clamped to `[1, MAX_RETRY_AFTER_SEC]`. A 200
body is checked structurally (finite `riskScore`, `level` in the four
`RiskLevel` values from `src/core/aggregator.ts`, array `signals`, and a known
`meta.semanticMode`); I deliberately did not duplicate the whole `Verdict`
schema, since the server is same-origin and trusted, and the check only guards
against a proxy error page or a deploy mismatch. `Verdict` is imported as a type
from `src/pipeline/verdict.ts`, which is not server code; the import is erased at
build time.

### Browser wiring (`browser-deps.ts`)

`createBrowserIngestDeps()` returns `IngestDeps` with:

- `prepare.decode`: `createImageBitmap(file)` wrapped as a `DecodedImage`
  (`close` forwards to `ImageBitmap.close`).
- `prepare.createCanvas`: `document.createElement("canvas")` with the size set.
- `qr.loadReader`: the memoized `zxing-wasm/reader` loader above, with
  `wasmUrl = location.origin + ASSET_PATHS.zxingWasm`.
- `ocr.loadEngine`: `await import("tesseract.js")` (memoized), adapted to
  `OcrEngine`; `ocr.assetBaseUrl`: `location.origin`.

The file is not unit tested because it needs a browser. It is thin, and the try
page is its check. `tesseract.js` and `zxing-wasm` appear only inside `import()`
calls in functions here, which the boundary test enforces.

### Temporary try page

`src/app/try/page.tsx` is a `"use client"` component with a comment saying it is
temporary. It holds state for the chosen file, text, progress, ingest result,
build result and analyze result. Controls: a labelled file input, a drop area
and a document-level paste handler that take the first image only, a labelled
text area, and a button. On press it creates the deps once (`useRef`), calls
`ingestImage` when a file exists, `buildAnalyzeRequest`, and
`analyzeRequest` only when `request !== null`, then prints the results with
`JSON.stringify(value, null, 2)` inside `<pre>`. A `role="status"` region with
`aria-live="polite"` announces progress. No styles, no `px` font sizes, no
preview and no object URLs. It is not linked, but it is reachable by URL
(`/try`); the README says so, and removing the folder removes it.

## Library decisions

### OCR: tesseract.js 7.0.0

`.kiro/steering/tech.md` names Tesseract.js v5. The brief asks me to choose the
version, so I checked the newer releases (GitHub release notes):

- v6.0.0 fixed a memory leak that grew until a crash and reduced runtime and
  memory by default. Its breaking changes (outputs other than `text` off by
  default, reshaped `blocks`, removed `loadLanguage` and `initialize`) do not
  affect this design, which uses `createWorker`, `recognize` and `terminate`
  and reads only `text` and `confidence`.
- v7.0.0 (2025-12-15) adds a relaxed-SIMD build and reports 15 to 35 percent
  lower runtime than v6; it drops Node 14 only.

Chosen: `tesseract.js` 7.0.0 (Apache-2.0, 1.4 MB unpacked, published 2025-12-15,
about 11 months before this spec) and `tesseract.js-core` 7.0.0 (Apache-2.0, 30.6
MB unpacked because it ships all variants, published 2025-12-15). The core is
listed as its own pinned dependency because the copy script reads files from it,
even though `tesseract.js` already depends on `^7.0.0`. `tech.md` should be
updated (task 9).

### QR decoding library

| | jsQR | zxing-wasm | barcode-detector | qr-scanner |
|---|---|---|---|---|
| Version | 1.4.0 | 3.1.6 | 3.2.3 | 1.4.2 |
| License | Apache-2.0 | MIT (embeds zxing-cpp, Apache-2.0) | MIT | MIT |
| Last release | 2021-04-24 | 2026-10-19 | 2026-10-19 | 2022-11-23 |
| Shipped size | `jsQR.js` 257 KB (57 KB gzip) | wasm 947 KB (409 KB gzip) + JS 42 KB (12 KB gzip) | 260 KB unpacked, depends on zxing-wasm | 524 KB unpacked |
| Input | RGBA array, width, height | `ImageData`, `Blob`, bytes | `ImageBitmapSource` (polyfill of `BarcodeDetector`) | image, canvas, camera |
| Asset hosting | none (pure JS) | wasm must be self-hosted (default is a CDN) | same as zxing-wasm | worker file |
| Maintenance | no release for about 5.5 years | three releases between 2026-09-10 and 2026-10-19 | active | no release for about 4 years |

Chosen: zxing-wasm 3.1.6. Reasons: it is maintained (the steering says to prefer
maintained libraries; jsQR and qr-scanner have had no release for years), it
takes `ImageData` directly (matches `prepareImage`), it runs in Node with a
`wasmBinary` override (so the round-trip property test can use the real decoder
offline), and its options (`formats`, `maxNumberOfSymbols`, `textMode`) are
documented in its types. `barcode-detector` adds an API layer over the same wasm
without helping here. Costs accepted: a 947 KB wasm to host and an asynchronous
start. `tech.md` and `privacy-and-safety.md` mention jsQR and should be updated
(task 9). I did not benchmark decoding accuracy of the two options on real
photos; the choice rests on maintenance, API fit and testability, not on a
measured accuracy difference.

### Optional dev-only QR generator

`qrcode-generator` 2.0.4 (MIT, published 2025-08-07, 555 KB unpacked, ships its
own types, so no `@types` package) is the single new dev dependency, so the
optional round trip (PBT-58) is included. A scratch run (Node 22.16, outside the
repository) rendered QR modules into a plain `{ data, width, height }` object and
read them with `zxing-wasm/reader` after `prepareZXingModule({ overrides: { wasmBinary } })`.
URL, Wi-Fi, EMV, vCard, `mailto:` and a Vietnamese string all decoded to the same
text, and a blank image returned an empty array without throwing. One caveat: the
generator's default `stringToBytes` keeps only the low 8 bits of each UTF-16
unit, which corrupted the Vietnamese string, so the test sets
`qrcode.stringToBytes` to a `TextEncoder` UTF-8 encoder. `qrcode`+`@types/qrcode`
would be two dev dependencies and was not chosen.

## Self-hosted assets

Choice: a script run before `dev` and `build`, not committed copies. The assets
are about 16.3 MiB on disk; committing them would add that to history on every
version bump, while the script is reproducible and checks SHA-256 against the
manifest.

| Asset (target under `public/`) | Source package | Bytes | gzip estimate | Loaded |
|---|---|---|---|---|
| `tesseract/worker.min.js` | `tesseract.js` 7.0.0 `dist/` | 111 307 | 33 676 | OCR |
| `tesseract/core/tesseract-core-lstm.wasm.js` | `tesseract.js-core` 7.0.0 | 3 896 484 | 1 463 881 | OCR, one of three |
| `tesseract/core/tesseract-core-simd-lstm.wasm.js` | same | 3 899 472 | 1 464 529 | OCR, one of three |
| `tesseract/core/tesseract-core-relaxedsimd-lstm.wasm.js` | same | 3 905 767 | 1 465 961 | OCR, one of three |
| `tesseract/lang/eng.traineddata.gz` | `@tesseract.js-data/eng` 1.0.0 `4.0.0_best_int/` | 2 952 873 | already gzip | OCR |
| `tesseract/lang/vie.traineddata.gz` | `@tesseract.js-data/vie` 1.0.0 `4.0.0_best_int/` | 1 423 003 | already gzip | OCR |
| `zxing/zxing_reader.wasm` | `zxing-wasm` 3.1.6 `dist/reader/` | 946 860 | 409 087 | QR |

Total on disk 17 135 766 bytes. A first OCR run downloads about 5.6 MiB
(worker, one core, both language files); QR adds about 0.4 MiB. gzip sizes were
measured locally with .NET GZip at optimal level; the host may compress
differently. License files shipped next to the assets: `tesseract.js`
`LICENSE.md`, `worker.min.js.LICENSE.txt`, `tesseract.js-core` `LICENSE`,
`zxing-wasm` `LICENSE`.

`4.0.0_best_int` is the LSTM-only integerized "tessdata best" set that the
`naptha/tessdata` README says Tesseract.js uses by default for LSTM-only mode.
The full `4.0.0` set is 10.9 MB for English because it includes the legacy
engine, which is not used with OEM 1.

Licenses for `THIRD_PARTY_NOTICES.md`:

| Component | License | Note |
|---|---|---|
| tesseract.js 7.0.0 | Apache-2.0 | |
| tesseract.js-core 7.0.0 | Apache-2.0 | WebAssembly build of Tesseract and dependencies |
| Tesseract trained data (`eng`, `vie`) | Apache-2.0 | From `tessdata_best` (its `LICENSE` is Apache-2.0). The npm packages `@tesseract.js-data/*` declare MIT for the package itself. |
| Bundled in `worker.min.js` | MIT, BSD-3-Clause | `buffer`, `ieee754`, `regenerator-runtime`, `zlib.js` per `worker.min.js.LICENSE.txt` |
| zxing-wasm 3.1.6 | MIT | |
| zxing-cpp (inside the wasm) | Apache-2.0 | Per the `zxing-wasm` README. The README lists `zint` (BSD-3-Clause) for barcode writing; only the reader build is shipped, but I did not inspect the wasm for it. |

`qrcode-generator` is a dev dependency and is not shipped.

The `.gz` language files are served by Next.js as static files. Whether the
host adds `Content-Encoding: gzip` to them (which would make the library
decompress twice) was not checked; the try page is where a failure would show,
and the fallback is `gzip: false` with decompressed files.

## Data flow and privacy

| Data | Where it exists | Leaves the device? |
|---|---|---|
| Image file | `File`, decoded bitmap, canvas, `ImageData` | No. Released by `close()` and `dispose()`. |
| QR payload (any kind) | Local variable in `ingestImage`, then classified | No. Only an `http`/`https` URL string moves on. |
| OCR text | `Ingest_Result`, merged into `text` | Yes, as `text` in the analyze request, capped at 4000 units. |
| User text | Page state | Yes, as `text`. |
| Language data and wasm | Downloaded from this origin | They are downloaded; nothing is uploaded. |

Fetches inside `tesseract.js` and `zxing-wasm` only use the three self-hosted
paths we pass in. That is checked in unit tests by inspecting the options given
to the fake `createWorker` and the `locateFile` result, and in a real browser by
the Network tab (task 7.2). I could not open a browser in this session, so the
real-browser behavior is unverified until that check is done.

## Error handling

| Stage | Codes | Notes |
|---|---|---|
| File and prepare | `unsupported-type`, `invalid-size`, `file-too-large`, `decode-failed`, `too-many-pixels`, `canvas-unavailable` | Fixed set, no messages. |
| QR | `qr-engine-unavailable`, `qr-decode-failed` | An image with no QR code is not an error; payloads are empty. |
| OCR | `ocr-engine-unavailable`, `ocr-timeout`, `ocr-aborted`, `ocr-failed` | Caught values are discarded. |
| Ingest | any of the above, `unexpected` | `errorCode` only when nothing useful came out. |
| Analyze | `invalid-input`, `payload-too-large`, `invalid-content-type`, `rate-limited`, `internal-error`, `network-error`, `timeout`, `bad-response`, `unexpected-status` | Server codes pass through; no response text is returned. |

## Known limitations

- One QR code per image (`maxNumberOfSymbols: 1`).
- A QR with plain text is classified `text` but not analyzed, because only URLs
  are forwarded. The user sees the `no-url` notice.
- OCR quality depends on the image; thresholds are untuned.
- The pixel guard runs after decoding, so an extreme image can still use a lot of
  memory in the user's own tab.
- The first OCR run downloads about 5.6 MiB.
- A property test cannot check literally that "none of the characters after
  `WIFI:` appear in any output field", because common letters appear in the
  field names. PBT-48 uses a unique alphanumeric marker of at least 12
  characters, which cannot occur in any constant output string.
