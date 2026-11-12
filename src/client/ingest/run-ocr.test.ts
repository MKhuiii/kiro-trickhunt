import { describe, it, expect, vi } from "vitest";
import { runOcr } from "./run-ocr";
import type { OcrDeps, OcrEngine, OcrWorkerLike, OcrWorkerOptions, OcrProgress } from "./run-ocr";
import type { Mock } from "vitest";

const BASE = "https://example.test/app";
const canvas = { tag: "canvas" };

interface FakeWorker extends OcrWorkerLike {
  terminate: Mock<() => unknown>;
  recognize: Mock<(image: unknown) => Promise<unknown>>;
}

function makeWorker(recognize?: (img: unknown) => Promise<unknown>): FakeWorker {
  return {
    recognize: vi.fn<(image: unknown) => Promise<unknown>>(
      recognize ?? (async () => ({ data: { text: "hello world", confidence: 77 } })),
    ),
    terminate: vi.fn<() => unknown>(async () => undefined),
  };
}

function makeDeps(createWorker: OcrEngine["createWorker"] | ReturnType<typeof vi.fn>): OcrDeps {
  return {
    assetBaseUrl: BASE,
    loadEngine: async () => ({ createWorker: createWorker as OcrEngine["createWorker"] }),
  };
}

describe("runOcr", () => {
  it("returns text and confidence and terminates once", async () => {
    const worker = makeWorker();
    const result = await runOcr({ canvas }, makeDeps(vi.fn(async () => worker)));
    expect(result).toEqual({ ok: true, text: "hello world", confidence: 77 });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("maps engine load failure to ocr-engine-unavailable", async () => {
    const deps: OcrDeps = {
      assetBaseUrl: BASE,
      loadEngine: async () => {
        throw new Error("no wasm");
      },
    };
    expect(await runOcr({ canvas }, deps)).toEqual({ ok: false, code: "ocr-engine-unavailable" });
  });

  it("maps createWorker failure to ocr-engine-unavailable", async () => {
    const deps = makeDeps(vi.fn(async () => {
      throw new Error("boom");
    }));
    expect(await runOcr({ canvas }, deps)).toEqual({ ok: false, code: "ocr-engine-unavailable" });
  });

  it("passes languages, oem and self-hosted options to createWorker", async () => {
    const createWorker = vi.fn(async () => makeWorker());
    await runOcr({ canvas }, makeDeps(createWorker));
    expect(createWorker).toHaveBeenCalledTimes(1);
    const [langs, oem, opts] = createWorker.mock.calls[0] as unknown as [string[], number, OcrWorkerOptions];
    expect(langs).toEqual(["vie", "eng"]);
    expect(oem).toBe(1);
    expect(opts.workerPath.startsWith(BASE)).toBe(true);
    expect(opts.corePath.startsWith(BASE)).toBe(true);
    expect(opts.langPath.startsWith(BASE)).toBe(true);
    expect(opts.workerBlobURL).toBe(false);
    expect(opts.cacheMethod).toBe("none");
  });

  it("calls recognize with only the canvas", async () => {
    const worker = makeWorker();
    await runOcr({ canvas }, makeDeps(vi.fn(async () => worker)));
    expect(worker.recognize.mock.calls).toEqual([[canvas]]);
  });

  it("times out when recognize never resolves, terminating once", async () => {
    const worker = makeWorker(() => new Promise(() => undefined));
    const result = await runOcr({ canvas }, makeDeps(vi.fn(async () => worker)), { timeoutMs: 20 });
    expect(result).toEqual({ ok: false, code: "ocr-timeout" });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("returns ocr-aborted when aborted mid-run and terminates", async () => {
    const worker = makeWorker(() => new Promise(() => undefined));
    const ctrl = new AbortController();
    const p = runOcr({ canvas }, makeDeps(vi.fn(async () => worker)), { signal: ctrl.signal, timeoutMs: 5000 });
    setTimeout(() => ctrl.abort(), 10);
    expect(await p).toEqual({ ok: false, code: "ocr-aborted" });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("returns ocr-aborted for an already aborted signal without creating a worker", async () => {
    const createWorker = vi.fn(async () => makeWorker());
    const ctrl = new AbortController();
    ctrl.abort();
    const result = await runOcr({ canvas }, makeDeps(createWorker), { signal: ctrl.signal });
    expect(result).toEqual({ ok: false, code: "ocr-aborted" });
    expect(createWorker).not.toHaveBeenCalled();
  });

  it("terminates a worker created after the timeout exactly once", async () => {
    const worker = makeWorker();
    const createWorker = vi.fn(
      () => new Promise<OcrWorkerLike>((res) => setTimeout(() => res(worker), 60)),
    );
    const result = await runOcr({ canvas }, makeDeps(createWorker), { timeoutMs: 15 });
    expect(result).toEqual({ ok: false, code: "ocr-timeout" });
    await new Promise((r) => setTimeout(r, 120));
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.recognize).not.toHaveBeenCalled();
  });

  it("ignores a throwing terminate", async () => {
    const worker = makeWorker();
    worker.terminate.mockImplementation(() => {
      throw new Error("terminate failed");
    });
    const result = await runOcr({ canvas }, makeDeps(vi.fn(async () => worker)));
    expect(result.ok).toBe(true);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("ignores a rejecting terminate", async () => {
    const worker = makeWorker();
    worker.terminate.mockImplementation(() => Promise.reject(new Error("nope")));
    const result = await runOcr({ canvas }, makeDeps(vi.fn(async () => worker)));
    expect(result.ok).toBe(true);
  });

  it("maps malformed recognize output to ocr-failed", async () => {
    const worker = makeWorker(async () => ({ data: { text: 5, confidence: "x" } }));
    expect(await runOcr({ canvas }, makeDeps(vi.fn(async () => worker)))).toEqual({
      ok: false,
      code: "ocr-failed",
    });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("maps recognize rejection to ocr-failed", async () => {
    const worker = makeWorker(async () => {
      throw new Error("bad image");
    });
    expect(await runOcr({ canvas }, makeDeps(vi.fn(async () => worker)))).toEqual({
      ok: false,
      code: "ocr-failed",
    });
  });

  it("clamps progress to 0..1 and survives a throwing callback", async () => {
    const seen: OcrProgress[] = [];
    const createWorker = vi.fn(async (_l: readonly string[], _o: number, opts: OcrWorkerOptions) => {
      opts.logger({ status: "loading", progress: -3 });
      opts.logger({ status: "recognizing text", progress: 7 });
      opts.logger({ status: "recognizing text", progress: Number.NaN });
      opts.logger(null);
      return makeWorker();
    });
    const result = await runOcr({ canvas }, makeDeps(createWorker), {
      onProgress: (p) => {
        seen.push(p);
        throw new Error("cb failed");
      },
    });
    expect(result.ok).toBe(true);
    expect(seen.length).toBeGreaterThanOrEqual(4);
    for (const p of seen) {
      expect(p.progress).toBeGreaterThanOrEqual(0);
      expect(p.progress).toBeLessThanOrEqual(1);
    }
    expect(seen.some((p) => p.stage === "recognizing" && p.progress === 1)).toBe(true);
  });
});
