# Requirements Document

## Introduction

Browser-side ingest of screenshots and QR images. A user picks, drops or pastes
one image; the browser validates it, redraws it on a canvas, decodes a QR code,
runs OCR, and turns the result into the `{ text, urls }` body that the existing
`POST /api/analyze` accepts. The image never leaves the device.

All code lives in `src/client/ingest/`. A temporary page at `src/app/try/page.tsx`
exercises it until the real UI is built in a later spec. Pure logic
(validation, size math, QR classification, request building, OCR assessment) is
separated from browser adapters (canvas, QR library, OCR worker, fetch), and
every adapter takes its dependencies as parameters so tests use fakes.

**Hard constraints:**
- `src/core/`, `src/analyzers/`, `src/pipeline/`, `src/server/` and the
  `POST /api/analyze` contract are NOT changed.
- Relative imports only. The project has no path alias.
- Client source never imports from `src/server/`. Test files may.
- The only network call written in this feature is a same-origin
  `POST /api/analyze` carrying only `text` and `urls`, made in
  `analyze-client.ts`. No image bytes, image data URLs or object URLs appear in
  any request.
- Nothing the user provides is stored: no `localStorage`, `sessionStorage`,
  IndexedDB, cookies or Cache API entries.
- Heavy libraries (`tesseract.js`, `zxing-wasm`) are loaded only with a dynamic
  `import()` inside a function, never at module top level.
- No third-party host is used at runtime. OCR worker, wasm and language data and
  the QR wasm are served from `public/`.
- Non-URL QR payloads (Wi-Fi, contact, payment, text, other) are never
  forwarded. Only `http` and `https` URLs are.
- Client limits equal the server limits; a test enforces it.
- Tests never touch the network, never need a real browser, and use fakes for
  the decoder, canvas, QR reader, OCR engine and `fetch`.

## Glossary

- **Ingest_Config**: Constants in `ingest.config.ts` (limits, thresholds, timeouts, prefixes, asset paths).
- **Prepared_Image**: The result of `prepareImage`: pixel `ImageData` and a canvas, both redrawn at the fitted size, plus an idempotent `dispose()`.
- **QR_Classification**: `{ kind, url? }` produced by `classifyQrPayload`. It never carries payload content other than the `url` of a `url` result.
- **QR_Kind**: One of `"url" | "payment" | "wifi" | "contact" | "text" | "other"`.
- **Build_Result**: `{ request, notices }` returned by `buildAnalyzeRequest`. `request` is `{ text?, urls? }` or `null`.
- **Notice**: A closed-set object `{ kind }` that tells the UI something to warn about, with no user content.
- **Ingest_Result**: `{ ocrText?, qrResults, notices, errorCode? }` returned by `ingestImage`.
- **Self_Hosted_Assets**: Files copied into `public/tesseract/` and `public/zxing/` by `scripts/copy-client-assets.mjs`.
- **Asset_Manifest**: `assets.manifest.json`, listing each asset source, target, byte size and SHA-256.
- **Reader**: The object returned by `deps.loadReader()` that reads QR payloads from `ImageData`.
- **Engine**: The loaded OCR module returned by `deps.loadEngine()`.

## Requirements

### Requirement 1: Image File Validation and Sizing

**User Story:** As a user, I want clear feedback about unsupported or oversized files, so that I know what to change before waiting for processing.

```ts
type ImageFileCode = "unsupported-type" | "invalid-size" | "file-too-large";
function validateImageFile(file: { type: string; size: number }):
  | { ok: true } | { ok: false; code: ImageFileCode };
function fitWithin(width: number, height: number, maxDimension: number):
  { width: number; height: number };
```

#### Acceptance Criteria

1. **REQ-CI-01** THE `validateImageFile` function SHALL return `{ ok: true }` if and only if `type` (compared case-insensitively) is one of `image/png`, `image/jpeg`, `image/webp` AND `size` is an integer from 1 to `MAX_IMAGE_BYTES`, and SHALL otherwise return `unsupported-type` (checked first), `invalid-size` (not an integer of at least 1) or `file-too-large`.
2. **REQ-CI-02** THE `validateImageFile` function SHALL NOT throw for any input, including non-string `type`, non-number `size` and missing properties.
3. **REQ-CI-03** THE `fitWithin` function SHALL accept positive integers and return integers, SHALL return the input size unchanged when both sides are at most `maxDimension`, and SHALL otherwise scale both sides by `maxDimension / max(width, height)`, round, and raise each side to at least 1, so aspect ratio is kept within one pixel and the result is never larger than the input.
4. **REQ-CI-04** THE `fitWithin` function SHALL return `{ width: 0, height: 0 }` for any input that is not a positive safe integer or when `maxDimension` is not a positive safe integer, and SHALL NOT throw.
5. **REQ-CI-05** THE Ingest_Config SHALL define `MAX_IMAGE_BYTES` (10 MiB), `MAX_IMAGE_DIMENSION` (2400) and `MAX_SOURCE_PIXELS` (50 000 000) as constants in one block.

### Requirement 2: QR Payload Classification

**User Story:** As a user, I want a scanned QR code recognised as a link, payment, Wi-Fi or contact code, so that I get a relevant warning and only real web links are analyzed.

```ts
type QrKind = "url" | "payment" | "wifi" | "contact" | "text" | "other";
interface QrClassification { readonly kind: QrKind; readonly url?: string }
function classifyQrPayload(payload: string): QrClassification;
```

#### Acceptance Criteria

1. **REQ-CI-06** THE `classifyQrPayload` function SHALL return an object whose own keys are only `kind` and, for kind `url`, `url`, SHALL return kind `other` for any non-string or blank input, and SHALL NOT throw.
2. **REQ-CI-07** THE `classifyQrPayload` function SHALL apply checks in this order and stop at the first match: `wifi` (prefix `WIFI:`), `payment` (any prefix in `PAYMENT_PREFIXES`, which includes the EMVCo prefix `000201`), `contact` (prefix `BEGIN:VCARD`, `MECARD:`, `mailto:`, `tel:` or `sms:`), `url`, `text`, `other`, with scheme prefixes compared case-insensitively on the trimmed payload.
3. **REQ-CI-08** THE `classifyQrPayload` function SHALL return kind `url` with `url` equal to the trimmed payload if and only if the trimmed payload has no whitespace or control character, is at most `MAX_URL_CHARS` long, and `new URL(...)` parses it with protocol `http:` or `https:` and a non-empty hostname.
4. **REQ-CI-09** THE `classifyQrPayload` function SHALL return kind `text` for a non-blank payload that has no URI scheme prefix (`^[a-z][a-z0-9+.-]*:`), and kind `other` for everything else, including unknown schemes and `http(s)` payloads that are invalid or longer than `MAX_URL_CHARS`.
5. **REQ-CI-10** THE `classifyQrPayload` function SHALL NOT include any part of a non-`url` payload in its result, and SHALL return a frozen object.
6. **REQ-CI-11** THE prefix lists SHALL live in the Ingest_Config so that adding a payment scheme needs no logic change.

### Requirement 3: Analyze Request Building

**User Story:** As a developer, I want one function that turns user text, OCR text and QR results into a valid API body plus warnings, so that the server never rejects an ingest result for size or shape.

```ts
type BuildNotice = { kind: "payment-qr" | "wifi-qr" | "no-url" | "text-truncated" };
interface AnalyzeRequest { text?: string; urls?: string[] }
function buildAnalyzeRequest(input: {
  userText?: string; ocrText?: string; qrResults: readonly QrClassification[];
}): { request: AnalyzeRequest | null; notices: readonly BuildNotice[] };
```

#### Acceptance Criteria

1. **REQ-CI-12** THE `buildAnalyzeRequest` function SHALL NOT throw for any input, SHALL ignore malformed `qrResults` entries, and SHALL always return an object with `request` (possibly `null`) and `notices`, so that notices survive when there is nothing to analyze.
2. **REQ-CI-13** THE `text` field SHALL be the non-blank, trimmed `userText` followed by the non-blank, trimmed `ocrText`, joined with a blank line, trimmed, and cut to at most `MAX_TEXT_CHARS` UTF-16 units without leaving a lone high surrogate at the end, and SHALL be omitted when blank.
3. **REQ-CI-14** THE `urls` field SHALL contain, in input order, the `url` of each `qrResults` entry of kind `url` whose `url` is a string that again passes the `http`/`https` check of REQ-CI-08, de-duplicated by exact string, at most `MAX_URLS_IN` items, and SHALL be omitted when empty.
4. **REQ-CI-15** THE `request` SHALL be `null` if and only if both `text` and `urls` are omitted, and every non-null `request` SHALL be accepted by the real server request parser.
5. **REQ-CI-16** THE `notices` SHALL be de-duplicated and ordered `payment-qr`, `wifi-qr`, `no-url`, `text-truncated`, where `payment-qr` and `wifi-qr` appear when a result of that kind exists, `no-url` appears when a result of kind `contact`, `text` or `other` exists and no result has kind `url`, and `text-truncated` appears when the text was cut.
6. **REQ-CI-17** THE `notices` and `request` SHALL NOT contain any content of a non-`url` QR payload, and each notice SHALL have only the key `kind`.

### Requirement 4: OCR Quality Assessment

**User Story:** As a user, I want garbage OCR output ignored, so that a blurry photo does not produce misleading signals.

```ts
function assessOcr(
  ocr: { text: string; confidence: number },
  thresholds?: { minChars?: number; minConfidence?: number },
): "usable" | "too-poor";
```

#### Acceptance Criteria

1. **REQ-CI-18** THE `assessOcr` function SHALL return `usable` if and only if the count of non-whitespace characters in `text` is at least `minChars` AND `confidence` is a finite number at least `minConfidence`, with defaults `OCR_MIN_CHARS` and `OCR_MIN_CONFIDENCE` from the Ingest_Config.
2. **REQ-CI-19** THE `assessOcr` function SHALL return `too-poor` for a non-string `text` or a non-finite `confidence`, SHALL fall back to the defaults for invalid thresholds, and SHALL NOT throw.

### Requirement 5: Image Preparation

**User Story:** As a user, I want my image checked and shrunk safely in the browser, so that large photos do not freeze the page and no metadata survives.

```ts
type PrepareErrorCode =
  | ImageFileCode | "decode-failed" | "too-many-pixels" | "canvas-unavailable";
interface PreparedImage {
  readonly width: number; readonly height: number;
  readonly imageData: ImageDataLike; readonly canvas: CanvasLike;
  dispose(): void;
}
function prepareImage(file: ImageFileLike, deps: PrepareImageDeps, options?: { timeoutMs?: number }):
  Promise<{ ok: true; image: PreparedImage } | { ok: false; code: PrepareErrorCode }>;
```

#### Acceptance Criteria

1. **REQ-CI-20** THE `prepareImage` function SHALL never reject and SHALL return a result with a code from the closed `PrepareErrorCode` set for every failure.
2. **REQ-CI-21** THE `prepareImage` function SHALL call `validateImageFile` first and SHALL NOT call the decoder when validation fails.
3. **REQ-CI-22** THE `prepareImage` function SHALL return `decode-failed` when the decoder throws, rejects, does not settle within `PREPARE_TIMEOUT_MS`, or returns a non-finite or non-positive size, and `too-many-pixels` when `width * height` exceeds `MAX_SOURCE_PIXELS`.
4. **REQ-CI-23** THE `prepareImage` function SHALL size a new canvas with `fitWithin(width, height, MAX_IMAGE_DIMENSION)`, draw the decoded image once, and read `ImageData` from that canvas, so only pixels are kept and metadata is dropped.
5. **REQ-CI-24** THE `prepareImage` function SHALL call `close()` exactly once on every decoded bitmap, including one that resolves after a timeout, and SHALL set the canvas width and height to 0 on every failure path.
6. **REQ-CI-25** THE `PreparedImage.dispose()` SHALL be idempotent and SHALL set the canvas width and height to 0.
7. **REQ-CI-26** THE `prepareImage` function SHALL NOT create object URLs, touch the network or write storage.

### Requirement 6: QR Decoding

**User Story:** As a user, I want a QR code in my image read on my device, so that its link can be analyzed without sending the image anywhere.

```ts
interface QrReader { read(imageData: ImageDataLike): Promise<unknown> }
function decodeQr(imageData: ImageDataLike, deps: { loadReader(): Promise<QrReader> },
  options?: { timeoutMs?: number }):
  Promise<{ payloads: string[]; errorCode?: "qr-engine-unavailable" | "qr-decode-failed" }>;
```

#### Acceptance Criteria

1. **REQ-CI-27** THE `decodeQr` function SHALL never throw or reject, SHALL return `qr-engine-unavailable` with no payloads when `loadReader` throws or rejects, and SHALL return `qr-decode-failed` when reading throws, rejects or does not settle within `QR_TIMEOUT_MS`.
2. **REQ-CI-28** THE `decodeQr` function SHALL accept from the reader output only array items that are objects with a non-empty string `text` of at most `QR_MAX_PAYLOAD_CHARS` and `isValid` not equal to `false`, SHALL ignore everything else, and SHALL return at most `QR_MAX_RESULTS` (1) payloads.
3. **REQ-CI-29** THE default reader (`createZxingReader`) SHALL call `readBarcodes` with `formats: ["QRCode"]`, `maxNumberOfSymbols: QR_MAX_RESULTS` and `textMode: "Plain"` so the raw payload is returned unchanged.
4. **REQ-CI-30** THE default `loadReader` SHALL load `zxing-wasm/reader` with a dynamic `import()` and call `prepareZXingModule` with a `locateFile` override that points to the self-hosted `zxing_reader.wasm`, so no CDN is contacted.
5. **REQ-CI-31** THE documentation SHALL state that only one QR code per image is read.

### Requirement 7: OCR Execution

**User Story:** As a user, I want text in my screenshot read on my device in Vietnamese and English, so that the message can be checked without uploading the picture.

```ts
type OcrErrorCode = "ocr-engine-unavailable" | "ocr-timeout" | "ocr-aborted" | "ocr-failed";
interface OcrProgress { stage: "loading" | "recognizing"; progress: number } // 0..1
function runOcr(image: { canvas: unknown }, deps: OcrDeps,
  options?: { timeoutMs?: number; signal?: AbortSignal; onProgress?: (p: OcrProgress) => void }):
  Promise<{ ok: true; text: string; confidence: number } | { ok: false; code: OcrErrorCode }>;
```

#### Acceptance Criteria

1. **REQ-CI-32** THE `runOcr` function SHALL never reject, SHALL load the Engine through `deps.loadEngine()` (a dynamic `import("tesseract.js")` in the default), and SHALL return `ocr-engine-unavailable` when loading or `createWorker` fails.
2. **REQ-CI-33** THE `runOcr` function SHALL call `createWorker(OCR_LANGUAGES, OCR_OEM, options)` with `OCR_LANGUAGES = ["vie", "eng"]`, `OCR_OEM = 1` and `options` containing `workerPath`, `corePath` (a directory) and `langPath` (no trailing slash) as absolute same-origin URLs built from `deps.assetBaseUrl`, plus `workerBlobURL: false` and `cacheMethod: "none"`.
3. **REQ-CI-34** THE `runOcr` function SHALL pass only `image.canvas` to the worker and SHALL NOT pass a `Blob`, `File`, URL or image bytes of the original file.
4. **REQ-CI-35** THE `runOcr` function SHALL stop with `ocr-timeout` after `OCR_TIMEOUT_MS` (or `options.timeoutMs`) and with `ocr-aborted` when `options.signal` aborts, whichever happens first, and SHALL return `ocr-failed` when recognition throws, rejects or returns a non-string `text` or non-finite `confidence`.
5. **REQ-CI-36** THE `runOcr` function SHALL call `terminate()` exactly once on every worker it created, on success, error, timeout and abort, including a worker whose creation resolves after the result was already returned, and SHALL ignore errors thrown by `terminate()`.
6. **REQ-CI-37** THE `runOcr` function SHALL report progress through `onProgress` with `progress` clamped to 0..1 and SHALL ignore errors thrown by the callback.

### Requirement 8: Ingest Orchestration

**User Story:** As a developer, I want one call that turns an image into text, QR classifications and notices, so that the UI does not need to know the order of steps.

```ts
type IngestNotice = { kind: "ocr-skipped" | "ocr-too-poor" | "ocr-failed" };
type IngestErrorCode = PrepareErrorCode | OcrErrorCode | "qr-engine-unavailable" | "qr-decode-failed" | "unexpected";
function ingestImage(file: ImageFileLike, deps: IngestDeps,
  options?: { skipOcrWhenQrFound?: boolean; signal?: AbortSignal; onProgress?: (p: OcrProgress) => void }):
  Promise<{ ocrText?: string; qrResults: QrClassification[]; notices: IngestNotice[]; errorCode?: IngestErrorCode }>;
```

#### Acceptance Criteria

1. **REQ-CI-38** THE `ingestImage` function SHALL never reject, SHALL run `prepareImage`, then `decodeQr`, then OCR, and SHALL return `errorCode` equal to the prepare code with empty `qrResults` and no notices when `prepareImage` fails.
2. **REQ-CI-39** THE `ingestImage` function SHALL classify each decoded payload with `classifyQrPayload` and SHALL return only the classifications, so raw payloads are not returned and are not kept after classification.
3. **REQ-CI-40** THE `ingestImage` function SHALL run OCR unless `skipOcrWhenQrFound` (default `SKIP_OCR_WHEN_QR_FOUND`, `false`) is true and at least one QR result exists, in which case it SHALL add the notice `ocr-skipped`.
4. **REQ-CI-41** THE `ingestImage` function SHALL return `ocrText` only when `assessOcr` returns `usable`, SHALL add `ocr-too-poor` when it returns `too-poor`, and SHALL add `ocr-failed` when OCR returns an error code.
5. **REQ-CI-42** THE `ingestImage` function SHALL set `errorCode` only when `ocrText` is absent, `qrResults` is empty and at least one stage returned an error code, and SHALL NOT set it for an image that simply has no text and no QR code.
6. **REQ-CI-43** THE `ingestImage` function SHALL call `dispose()` on the Prepared_Image exactly once on every path after preparation succeeded.

### Requirement 9: Analyze Client

**User Story:** As a user, I want the app to ask the server for a verdict using only text and links, and to tell me clearly when it is busy, so that nothing private is sent and I know when to retry.

```ts
type AnalyzeClientCode =
  | "invalid-input" | "payload-too-large" | "invalid-content-type" | "rate-limited" | "internal-error"
  | "network-error" | "timeout" | "bad-response" | "unexpected-status";
type AnalyzeClientResult =
  | { ok: true; verdict: Verdict; semanticMode: "used" | "budget-exhausted" | "not-configured" }
  | { ok: false; code: AnalyzeClientCode; retryAfterSec?: number };
function analyzeRequest(request: AnalyzeRequest, deps?: AnalyzeClientDeps): Promise<AnalyzeClientResult>;
```

#### Acceptance Criteria

1. **REQ-CI-44** THE `analyzeRequest` function SHALL never reject, and `analyze-client.ts` SHALL be the only client source file that calls `fetch`.
2. **REQ-CI-45** THE `analyzeRequest` function SHALL send `POST` to the relative URL `/api/analyze` with header `Content-Type: application/json`, `credentials: "same-origin"`, `cache: "no-store"` and `referrerPolicy: "no-referrer"`, and a body whose only possible keys are `text` (a string) and `urls` (an array of strings), regardless of extra properties on the input.
3. **REQ-CI-46** THE `analyzeRequest` function SHALL return `timeout` when no response arrives within `ANALYZE_TIMEOUT_MS`, even if the injected `fetch` ignores the abort signal, and `network-error` when `fetch` throws or rejects.
4. **REQ-CI-47** THE `analyzeRequest` function SHALL map a non-200 response to the `error.code` of the body when it is one of the five fixed API codes, otherwise to the code for status 400, 413, 415, 429 or 500, and otherwise to `unexpected-status`, without including any response text.
5. **REQ-CI-48** WHEN the status is 429, THE `analyzeRequest` function SHALL set `retryAfterSec` from the `Retry-After` header as an integer clamped to 1 to `MAX_RETRY_AFTER_SEC`, or to `DEFAULT_RETRY_AFTER_SEC` when the header is missing or invalid.
6. **REQ-CI-49** WHEN the status is 200, THE `analyzeRequest` function SHALL return `ok: true` only if the body has an object `verdict` with a finite `riskScore`, a `level` in `no_signals | suspicious | high | critical` and an array `signals`, and a `meta.semanticMode` in the closed set, and SHALL otherwise return `bad-response`.
7. **REQ-CI-50** THE `analyze-client.ts` file SHALL import `Verdict` only as a type and SHALL NOT import from `src/server/`.

### Requirement 10: Self-Hosted Assets and Dependencies

**User Story:** As an operator, I want every browser asset served from my own origin with known versions, sizes and licenses, so that a CDN outage or change cannot affect users or privacy.

#### Acceptance Criteria

1. **REQ-CI-51** THE `package.json` SHALL pin exact versions (no range operators): dependencies `tesseract.js` 7.0.0, `tesseract.js-core` 7.0.0 and `zxing-wasm` 3.1.6, and devDependencies `@tesseract.js-data/eng` 1.0.0, `@tesseract.js-data/vie` 1.0.0 and `qrcode-generator` 2.0.4.
2. **REQ-CI-52** THE Asset_Manifest SHALL list for every Self_Hosted_Assets file its `from` (under `node_modules`), `to` (under `public/`), byte size and SHA-256, and SHALL include `worker.min.js`, the three LSTM core files `tesseract-core-lstm.wasm.js`, `tesseract-core-simd-lstm.wasm.js` and `tesseract-core-relaxedsimd-lstm.wasm.js`, `eng.traineddata.gz` and `vie.traineddata.gz` from the `4.0.0_best_int` folders, `zxing_reader.wasm`, and the license files that ship with them.
3. **REQ-CI-53** THE script `scripts/copy-client-assets.mjs` SHALL copy each manifest file, SHALL skip files whose size and hash already match, SHALL stop with a non-zero exit code and a fixed message when a source is missing or its hash differs, and SHALL run before `dev` and `build` through `predev` and `prebuild`.
4. **REQ-CI-54** THE generated directories `public/tesseract/` and `public/zxing/` SHALL be listed in `.gitignore`, and the asset URL paths used by the OCR and QR code SHALL each equal a manifest `to` path, enforced by a unit test.
5. **REQ-CI-55** THE repository SHALL contain `THIRD_PARTY_NOTICES.md` at the root listing, for each shipped third-party component, its name, version, license and source, and the license files SHALL be copied next to the assets.

### Requirement 11: Privacy and Boundary Guards

**User Story:** As a maintainer, I want the privacy rules enforced by tests, so that a later change cannot quietly add a network call, a storage write or a server import.

#### Acceptance Criteria

1. **REQ-CI-56** THE Ingest_Config `MAX_TEXT_CHARS`, `MAX_URLS_IN` and `MAX_URL_CHARS` SHALL equal the values in `src/server/api/api-limits.config.ts`, enforced by a test file that imports both.
2. **REQ-CI-57** THE client source files (non-test) under `src/client/` and `src/app/try/` SHALL NOT import from `src/server/` and SHALL NOT use `XMLHttpRequest`, `sendBeacon`, `WebSocket` or `EventSource`, enforced by a source-scan test.
3. **REQ-CI-58** THE client source files SHALL NOT use `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie` or `caches`, and `runOcr` SHALL set `cacheMethod: "none"` so the OCR library does not cache in IndexedDB.
4. **REQ-CI-59** THE client source files SHALL reference `tesseract.js` and `zxing-wasm` only in `import()` expressions inside functions, never in static `import` statements, and SHALL NOT contain the strings `jsdelivr`, `unpkg` or `projectnaptha`, enforced by a source-scan test.
5. **REQ-CI-60** THE pure modules (`validate-image-file`, `fit-within`, `qr-payload`, `analyze-input`, `ocr-quality`, `ingest.config`, `types`) SHALL NOT reference `window`, `document`, `navigator`, `fetch` or `process`, enforced by a source-scan test.

### Requirement 12: Temporary Try Page

**User Story:** As the developer, I want a throwaway page that runs the whole flow, so that I can check the ingest code in a real browser before the real UI exists.

#### Acceptance Criteria

1. **REQ-CI-61** THE file `src/app/try/page.tsx` SHALL be a client component (`"use client"`) with a default export, SHALL begin with a comment that marks it temporary and to be replaced, and SHALL NOT be linked from any other page.
2. **REQ-CI-62** THE page SHALL let the user pick, drop or paste one image and type text in a text area, and SHALL run the flow only on an explicit button press.
3. **REQ-CI-63** THE page SHALL show OCR progress, the extracted OCR text, the QR kinds (and the URL of a `url` result only), the notices and any error code.
4. **REQ-CI-64** THE page SHALL call `ingestImage` (when an image is given), `buildAnalyzeRequest` and, only when `request` is not `null`, `analyzeRequest`, and SHALL print the verdict, or the error result, as JSON.
5. **REQ-CI-65** THE page SHALL be unstyled but accessible: labelled controls, a status region with `aria-live`, and no fixed-pixel font sizes.
6. **REQ-CI-66** THE page SHALL NOT create object URLs, preview or store the image, and SHALL keep results in component state only.

### Requirement 13: Documentation

**User Story:** As a developer or reviewer, I want the README to say what runs where and what the limits are, so that I can trust and maintain the feature.

#### Acceptance Criteria

1. **REQ-CI-67** THE `README.md` SHALL have a section on image and QR input that lists what runs in the browser and what runs on the server, and states that images never leave the browser and that the only request is `POST /api/analyze` with `text` and `urls`.
2. **REQ-CI-68** THE section SHALL state the one-QR-per-image limitation, the OCR accuracy caveat (blurry, small or low-contrast text, mixed scripts), the accepted formats and size limits, and that `/try` is temporary.
3. **REQ-CI-69** THE section SHALL explain how the self-hosted assets reach `public/` (the `predev`/`prebuild` script), their approximate download sizes on first use, and where the license notices are.

## Property-Based Testing Requirements

Continues after PBT-46. Use `numRuns >= 100` unless stated. All adapter
properties use fakes; none touches the network or a browser. Time-based cases
use a `timeoutMs` of a few milliseconds.

| ID | Property | Generator hint |
|---|---|---|
| **PBT-47** | `classifyQrPayload` never throws; `kind` is in the closed set; own keys are only `kind` and `url`; `url` exists only when `kind` is `url`, and then it parses as `http`/`https` and is at most `MAX_URL_CHARS` | `fc.string()`, `fc.anything()` cast as string, long `http(s)` strings, prefixed strings |
| **PBT-48** | A payload that starts with `WIFI:` (any case) never yields `url`, and a unique marker placed after the prefix does not appear in `JSON.stringify` of the classification or of the `buildAnalyzeRequest` result | `"WIFI:" + marker` with `fc.stringMatching(/^[A-Za-z0-9]{12,40}$/)`, arbitrary user and OCR text without the marker |
| **PBT-49** | `buildAnalyzeRequest` never throws; `text` is at most `MAX_TEXT_CHARS`; `urls` has at most `MAX_URLS_IN` distinct `http`/`https` items each at most `MAX_URL_CHARS`; `request` is `null` only when there is nothing to analyze | `fc.string()` up to 10 000 chars, arrays of classifications and malformed items |
| **PBT-50** | Every non-null `request` is accepted by the real `readAnalyzeRequest` for a JSON `POST`, and its encoded body is at most `MAX_BODY_BYTES` | Same as PBT-49 with control characters and astral characters; `new Request(...)` |
| **PBT-51** | `fitWithin`: both outputs at most `maxDimension` and at most the input; both at least 1; each output within one pixel of `input * scale`; unchanged when already within bounds | `fc.integer({ min: 1, max: 100000 })` for sides, `fc.integer({ min: 1, max: 8000 })` for the limit |
| **PBT-52** | `validateImageFile` returns `ok` exactly when the type is allowed (case-insensitive) and the size is an integer from 1 to `MAX_IMAGE_BYTES`; the failure code follows the order `unsupported-type`, `invalid-size`, `file-too-large` | `fc.string()` mixed with allowed types in random case; `fc.integer`, `fc.double`, `NaN`, `Infinity`, negatives |
| **PBT-53** | `prepareImage` never rejects for decoders that throw, reject, never settle, return malformed sizes or oversized images, and for canvases or contexts that throw; every decoded bitmap is closed exactly once, including late ones; a successful result has integer sides within `MAX_IMAGE_DIMENSION` | Fake `decode`, `createCanvas`, `getContext` built from `fc.oneof` outcomes; short `timeoutMs` |
| **PBT-54** | `decodeQr` never rejects for readers that throw, reject, never settle or return arbitrary values; every returned payload is a non-empty string within `QR_MAX_PAYLOAD_CHARS`; the count is at most `QR_MAX_RESULTS` | `fc.anything()`, arrays of mixed items, loader failures |
| **PBT-55** | `runOcr` never rejects for engines whose `createWorker` or `recognize` throw, reject, never settle, resolve late or return malformed output, and for aborts at random times; every created worker gets `terminate` exactly once; a success has a string `text` and finite `confidence`; a failure has a code from the closed set | Fake engine with a worker registry; `fc.oneof` outcomes; short `timeoutMs`; `AbortController` |
| **PBT-56** | `analyzeRequest` never rejects for `fetch` that throws, rejects, never settles or returns any status, headers and body (including non-JSON); the result code is in the closed set; the captured body has only the keys `text` and `urls`, the method is `POST` and the URL is `/api/analyze` | `fc.anything()` cast as input and as parsed body, `fc.integer({ min: 100, max: 599 })`, odd `Retry-After` strings |
| **PBT-57** | `ingestImage` never rejects for arbitrary fake stage outcomes; `dispose` is called exactly once when preparation succeeded; a unique marker inside any non-`url` QR payload never appears in `JSON.stringify` of the result | Fakes for `prepareImage`, reader and OCR; marker payloads of each kind |
| **PBT-58** | Round trip: encoding a QR image with the dev-only `qrcode-generator` and reading it with `decodeQr` over the real `zxing-wasm` reader returns the same string (`numRuns` 50) | Short non-empty strings; Node loads the wasm with the `wasmBinary` override; UTF-8 bytes set on the generator |

### Example-based scenarios

- A message-screenshot text (fake OCR) plus a QR with the URL `https://secure-login.example/verify` gives one request with both `text` and `urls`.
- A Wi-Fi QR (`WIFI:T:WPA;S:home;P:secret;;`) gives no `urls`, the notice `wifi-qr`, and nothing from the payload in the output.
- A payment QR (`000201...`) gives the notice `payment-qr` and no payload content.
- A file of `MAX_IMAGE_BYTES + 1` bytes gives `file-too-large` and the decoder is never called.
- An OCR engine that never resolves gives `ocr-timeout` and the fake worker's `terminate` is called once.
- A 429 response with `Retry-After: 12` gives `rate-limited` with `retryAfterSec` 12.
- `MAX_TEXT_CHARS`, `MAX_URLS_IN` and `MAX_URL_CHARS` equal the server values.

## Out of Scope

The real UI and styling, live camera scanning, PDF or video input, several
images at once, more than one QR code per image, any server change, any change
to analyzers, pipeline or core, forwarding QR text payloads, analytics, and
persistent caching of OCR language data.

## Non-Functional Requirements

- **NFR-CI-01** The first scan must not block the main thread for long: decoding
  and recognition run in a Web Worker (Tesseract.js) or WebAssembly, and the
  image is downscaled to `MAX_IMAGE_DIMENSION` before either runs.
- **NFR-CI-02** Limits, thresholds, timeouts, languages, prefixes and asset paths
  are editable in `ingest.config.ts` without touching logic or its tests.
