import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAnalyzeRequest } from "./analyze-input";
import { ingestImage } from "./ingest-image";
import type { IngestDeps } from "./ingest-image";
import { MAX_IMAGE_BYTES, OCR_TIMEOUT_MS } from "./ingest.config";
import type { CanvasLike } from "./types";

const FILE = { type: "image/png", size: 1000 };
const SCREENSHOT_TEXT = "Your bank account is locked. Verify now to avoid closure.";

interface Counters {
  decode: number;
  createCanvas: number;
  loadReader: number;
  read: number;
  loadEngine: number;
  recognize: number;
  terminate: number;
  zeroWrites: number;
}

interface FakeOptions {
  qrPayloads?: string[];
  ocr?: "ok" | "hang" | "text-empty";
  ocrText?: string;
}

function makeDeps(options: FakeOptions = {}): { deps: IngestDeps; counters: Counters } {
  const counters: Counters = {
    decode: 0,
    createCanvas: 0,
    loadReader: 0,
    read: 0,
    loadEngine: 0,
    recognize: 0,
    terminate: 0,
    zeroWrites: 0,
  };
  const ocrMode = options.ocr ?? "ok";
  const deps: IngestDeps = {
    prepare: {
      async decode() {
        counters.decode += 1;
        return { width: 100, height: 50, source: {}, close() {} };
      },
      createCanvas(width, height) {
        counters.createCanvas += 1;
        let w = width;
        const canvas: CanvasLike = {
          get width() {
            return w;
          },
          set width(value: number) {
            if (value === 0) counters.zeroWrites += 1;
            w = value;
          },
          height,
          getContext() {
            return {
              drawImage() {},
              getImageData: (_x, _y, sw, sh) => ({
                data: new Uint8ClampedArray(sw * sh * 4),
                width: sw,
                height: sh,
              }),
            };
          },
        };
        return canvas;
      },
    },
    qr: {
      async loadReader() {
        counters.loadReader += 1;
        return {
          async read() {
            counters.read += 1;
            return (options.qrPayloads ?? []).map((text) => ({ text, isValid: true }));
          },
        };
      },
    },
    ocr: {
      assetBaseUrl: "http://localhost",
      async loadEngine() {
        counters.loadEngine += 1;
        return {
          async createWorker() {
            return {
              recognize: () => {
                counters.recognize += 1;
                if (ocrMode === "hang") return new Promise<never>(() => undefined);
                const text = ocrMode === "text-empty" ? "" : (options.ocrText ?? SCREENSHOT_TEXT);
                return Promise.resolve({ data: { text, confidence: 90 } });
              },
              terminate: () => {
                counters.terminate += 1;
              },
            };
          },
        };
      },
    },
  };
  return { deps, counters };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ingestImage (end to end with fakes)", () => {
  it("returns OCR text and one url result, and buildAnalyzeRequest keeps both", async () => {
    const { deps } = makeDeps({ qrPayloads: ["https://secure-login.example/verify"] });
    const result = await ingestImage(FILE, deps);
    expect(result.errorCode).toBeUndefined();
    expect(result.ocrText).toBe(SCREENSHOT_TEXT);
    expect(result.qrResults).toEqual([{ kind: "url", url: "https://secure-login.example/verify" }]);

    const built = buildAnalyzeRequest({ ocrText: result.ocrText, qrResults: result.qrResults });
    expect(built.request).toEqual({
      text: SCREENSHOT_TEXT,
      urls: ["https://secure-login.example/verify"],
    });
  });

  it("classifies a Wi-Fi QR as wifi and never exposes the payload", async () => {
    const secret = "WIFI:T:WPA;S:HomeNet;P:hunter2-secret;;";
    const { deps } = makeDeps({ qrPayloads: [secret], ocr: "text-empty" });
    const result = await ingestImage(FILE, deps);
    expect(result.qrResults).toEqual([{ kind: "wifi" }]);
    const json = JSON.stringify(result);
    expect(json).not.toContain("hunter2-secret");
    expect(json).not.toContain("HomeNet");
    expect(json).not.toContain("WIFI:");
  });

  it("classifies a payment QR as payment and never exposes the payload", async () => {
    const secret = "000201010212ACCOUNT-9876543210";
    const { deps } = makeDeps({ qrPayloads: [secret], ocr: "text-empty" });
    const result = await ingestImage(FILE, deps);
    expect(result.qrResults).toEqual([{ kind: "payment" }]);
    const json = JSON.stringify(result);
    expect(json).not.toContain("9876543210");
    expect(json).not.toContain("000201");
  });

  it("rejects an oversize file with file-too-large and runs no stage", async () => {
    const { deps, counters } = makeDeps({ qrPayloads: ["https://a.example/x"] });
    const result = await ingestImage({ type: "image/png", size: MAX_IMAGE_BYTES + 1 }, deps);
    expect(result.errorCode).toBe("file-too-large");
    expect(result.qrResults).toEqual([]);
    expect(result.ocrText).toBeUndefined();
    expect(counters.decode).toBe(0);
    expect(counters.createCanvas).toBe(0);
    expect(counters.loadReader).toBe(0);
    expect(counters.loadEngine).toBe(0);
  });

  it("keeps the QR result, adds ocr-failed and no errorCode when OCR times out", async () => {
    vi.useFakeTimers();
    const { deps, counters } = makeDeps({
      qrPayloads: ["https://secure-login.example/verify"],
      ocr: "hang",
    });
    const pending = ingestImage(FILE, deps);
    await vi.advanceTimersByTimeAsync(OCR_TIMEOUT_MS + 1000);
    const result = await pending;
    expect(result.qrResults).toEqual([{ kind: "url", url: "https://secure-login.example/verify" }]);
    expect(result.notices).toEqual([{ kind: "ocr-failed" }]);
    expect(result.errorCode).toBeUndefined();
    expect(result.ocrText).toBeUndefined();
    expect(counters.terminate).toBe(1);
  });

  it("skips OCR with an ocr-skipped notice when the flag is set and a QR is found", async () => {
    const { deps, counters } = makeDeps({ qrPayloads: ["https://a.example/x"] });
    const result = await ingestImage(FILE, deps, { skipOcrWhenQrFound: true });
    expect(result.notices).toEqual([{ kind: "ocr-skipped" }]);
    expect(result.qrResults).toHaveLength(1);
    expect(counters.loadEngine).toBe(0);
    expect(counters.recognize).toBe(0);
  });

  it("gives no errorCode for an image with no text and no QR", async () => {
    const { deps } = makeDeps({ qrPayloads: [], ocr: "text-empty" });
    const result = await ingestImage(FILE, deps);
    expect(result.errorCode).toBeUndefined();
    expect(result.qrResults).toEqual([]);
    expect(result.ocrText).toBeUndefined();
  });

  it("disposes the prepared canvas exactly once on success", async () => {
    const { deps, counters } = makeDeps({ qrPayloads: [] });
    await ingestImage(FILE, deps);
    expect(counters.zeroWrites).toBe(1);
  });
});
