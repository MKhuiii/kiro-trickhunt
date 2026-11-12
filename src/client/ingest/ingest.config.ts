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
export const QR_MAX_PAYLOAD_CHARS = 7089; // largest QR capacity (numeric)
export const QR_TIMEOUT_MS = 15_000;

export const OCR_LANGUAGES = ["vie", "eng"] as const;
export const OCR_OEM = 1; // LSTM only
export const OCR_TIMEOUT_MS = 90_000;
export const OCR_MIN_CHARS = 10;
export const OCR_MIN_CONFIDENCE = 30;
export const SKIP_OCR_WHEN_QR_FOUND = false;

export const ANALYZE_ENDPOINT = "/api/analyze";
export const ANALYZE_TIMEOUT_MS = 20_000; // server maxDuration is 15 s
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
