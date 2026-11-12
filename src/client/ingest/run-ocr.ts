import { ASSET_PATHS, OCR_LANGUAGES, OCR_OEM, OCR_TIMEOUT_MS } from "./ingest.config";

// tesseract.js is never imported statically; deps.loadEngine() does a dynamic import.

export type OcrErrorCode =
  | "ocr-engine-unavailable"
  | "ocr-timeout"
  | "ocr-aborted"
  | "ocr-failed";

export interface OcrProgress {
  stage: "loading" | "recognizing";
  progress: number; // 0..1
}

export interface OcrWorkerLike {
  recognize(image: unknown): Promise<unknown>;
  terminate(): unknown;
}

// Option names verified against tesseract.js src/index.d.ts (WorkerOptions) and docs/api.md.
export interface OcrWorkerOptions {
  workerPath: string;
  corePath: string;
  langPath: string;
  workerBlobURL: false;
  cacheMethod: "none";
  logger(message: unknown): void;
  errorHandler(error: unknown): void;
}

export interface OcrEngine {
  createWorker(
    langs: readonly string[],
    oem: number,
    options: OcrWorkerOptions,
  ): Promise<OcrWorkerLike>;
}

export interface OcrDeps {
  loadEngine(): Promise<OcrEngine>;
  assetBaseUrl: string;
}

export interface RunOcrOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  onProgress?: (p: OcrProgress) => void;
}

export type RunOcrResult =
  | { ok: true; text: string; confidence: number }
  | { ok: false; code: OcrErrorCode };

function clamp01(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function runOcr(
  image: { canvas: unknown },
  deps: OcrDeps,
  options?: RunOcrOptions,
): Promise<RunOcrResult> {
  return new Promise<RunOcrResult>((resolve) => {
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let signal: AbortSignal | undefined;
    let onAbort: (() => void) | undefined;
    let onProgress: ((p: OcrProgress) => void) | undefined;
    const workers = new Set<OcrWorkerLike>();
    const terminated = new Set<OcrWorkerLike>();

    const terminateOnce = (worker: OcrWorkerLike): void => {
      if (terminated.has(worker)) return;
      terminated.add(worker);
      try {
        const out = worker.terminate();
        if (out !== null && typeof out === "object" && typeof (out as { then?: unknown }).then === "function") {
          (out as Promise<unknown>).then(undefined, () => undefined);
        }
      } catch {
        // ignored
      }
    };

    const register = (worker: OcrWorkerLike): void => {
      workers.add(worker);
      if (finished) terminateOnce(worker);
    };

    const finish = (result: RunOcrResult): void => {
      if (finished) return;
      finished = true;
      if (timer !== undefined) clearTimeout(timer);
      try {
        if (signal && onAbort) signal.removeEventListener("abort", onAbort);
      } catch {
        // ignored
      }
      for (const worker of workers) terminateOnce(worker);
      resolve(result);
    };

    const report = (stage: OcrProgress["stage"], progress: unknown): void => {
      if (finished || !onProgress) return;
      try {
        onProgress({ stage, progress: clamp01(progress) });
      } catch {
        // ignored
      }
    };

    const logger = (message: unknown): void => {
      try {
        const m = message as { status?: unknown; progress?: unknown } | null;
        const status = m !== null && typeof m === "object" ? m.status : undefined;
        const progress = m !== null && typeof m === "object" ? m.progress : undefined;
        report(status === "recognizing text" ? "recognizing" : "loading", progress);
      } catch {
        // ignored
      }
    };

    const errorHandler = (): void => {
      // Worker error content is never kept; failures surface as ocr-failed.
    };

    const work = async (): Promise<void> => {
      let worker: OcrWorkerLike;
      try {
        const engine = await deps.loadEngine();
        if (finished) return;
        const base = String(deps.assetBaseUrl).replace(/\/+$/, "");
        const workerOptions: OcrWorkerOptions = {
          workerPath: base + ASSET_PATHS.ocrWorker,
          corePath: base + ASSET_PATHS.ocrCoreDir,
          langPath: base + ASSET_PATHS.ocrLangDir,
          workerBlobURL: false,
          cacheMethod: "none",
          logger,
          errorHandler,
        };
        worker = await engine.createWorker(OCR_LANGUAGES, OCR_OEM, workerOptions);
      } catch {
        finish({ ok: false, code: "ocr-engine-unavailable" });
        return;
      }
      register(worker);
      if (finished) return;

      try {
        const result = await worker.recognize(image.canvas);
        const data = (result as { data?: unknown } | null | undefined)?.data as
          | { text?: unknown; confidence?: unknown }
          | null
          | undefined;
        const text = data?.text;
        const confidence = data?.confidence;
        if (typeof text !== "string" || typeof confidence !== "number" || !Number.isFinite(confidence)) {
          finish({ ok: false, code: "ocr-failed" });
          return;
        }
        finish({ ok: true, text, confidence });
      } catch {
        finish({ ok: false, code: "ocr-failed" });
      }
    };

    try {
      onProgress = options?.onProgress;
      signal = options?.signal;
      const requested = options?.timeoutMs;
      const timeoutMs =
        typeof requested === "number" && Number.isFinite(requested) && requested >= 0
          ? requested
          : OCR_TIMEOUT_MS;

      if (signal) {
        if (signal.aborted) {
          finish({ ok: false, code: "ocr-aborted" });
          return;
        }
        onAbort = () => finish({ ok: false, code: "ocr-aborted" });
        signal.addEventListener("abort", onAbort);
      }
      timer = setTimeout(() => finish({ ok: false, code: "ocr-timeout" }), timeoutMs);

      report("loading", 0);
      work().catch(() => finish({ ok: false, code: "ocr-failed" }));
    } catch {
      finish({ ok: false, code: "ocr-failed" });
    }
  });
}
