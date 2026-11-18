import { describe, expect, it } from "vitest";
import type {
  AnalyzeClientResult,
  AnalyzeRequest,
  BuildAnalyzeResult,
  IngestResult,
} from "../client/ingest";
import type { Verdict } from "../pipeline";
import { runCheck } from "./run-check";
import type { CheckDeps, CheckInput, CheckStatus } from "./run-check";

const VERDICT = { level: "suspicious" } as unknown as Verdict;

interface Calls {
  ingest: number;
  build: number;
  analyze: number;
  requests: AnalyzeRequest[];
}

interface Overrides {
  ingest?: () => Promise<IngestResult>;
  build?: (text: string) => BuildAnalyzeResult;
  analyze?: () => Promise<AnalyzeClientResult>;
}

function makeDeps(o: Overrides = {}): { deps: CheckDeps; calls: Calls } {
  const calls: Calls = { ingest: 0, build: 0, analyze: 0, requests: [] };
  const deps: CheckDeps = {
    async ingestImage() {
      calls.ingest++;
      return o.ingest
        ? o.ingest()
        : { ocrText: "ocr text", qrResults: [], notices: [] };
    },
    buildAnalyzeRequest(input) {
      calls.build++;
      if (o.build) return o.build(input.userText);
      const text = [input.userText, input.ocrText].filter(Boolean).join("\n");
      return {
        request: text === "" ? null : { text, locale: input.locale },
        notices: [],
      } as BuildAnalyzeResult;
    },
    async analyzeRequest(request) {
      calls.analyze++;
      calls.requests.push(request);
      return o.analyze
        ? o.analyze()
        : { ok: true, verdict: VERDICT, semanticMode: "used" };
    },
  };
  return { deps, calls };
}

const noStatus = (): void => {};
const textInput = (userText: string): CheckInput => ({ userText, file: null, locale: "en" });
const fileInput = (userText: string): CheckInput => ({
  userText,
  file: new File(["x"], "a.png", { type: "image/png" }),
  locale: "en",
});

describe("runCheck", () => {
  it("skips ingest when only text is given", async () => {
    const { deps, calls } = makeDeps();
    const out = await runCheck(deps, textInput("hello"), noStatus);
    expect(calls.ingest).toBe(0);
    expect(calls.analyze).toBe(1);
    expect(out.kind).toBe("done");
  });

  it("returns nothing with no calls for empty text and no file", async () => {
    const { deps, calls } = makeDeps();
    const out = await runCheck(deps, textInput("   \n "), noStatus);
    expect(out).toEqual({ kind: "nothing" });
    expect(calls).toMatchObject({ ingest: 0, build: 0, analyze: 0 });
  });

  it("returns nothing when the builder yields no request", async () => {
    const { deps, calls } = makeDeps({ build: () => ({ request: null, notices: [] }) });
    const out = await runCheck(deps, textInput("hi"), noStatus);
    expect(out).toEqual({ kind: "nothing" });
    expect(calls.analyze).toBe(0);
  });

  it("fails on ingest error without text, with mapped message and no analyze", async () => {
    const { deps, calls } = makeDeps({
      ingest: async () => ({ qrResults: [], notices: [], errorCode: "unsupported-type" }),
    });
    const out = await runCheck(deps, fileInput(""), noStatus);
    expect(out.kind).toBe("failed");
    if (out.kind === "failed") {
      expect(out.message.key).toBe("error.ingest.unsupported-type");
    }
    expect(calls.analyze).toBe(0);
  });

  it("continues on ingest error with text and adds an ocr-failed notice", async () => {
    const { deps, calls } = makeDeps({
      ingest: async () => ({ qrResults: [], notices: [], errorCode: "ocr-failed" }),
    });
    const out = await runCheck(deps, fileInput("typed text"), noStatus);
    expect(calls.analyze).toBe(1);
    expect(out.kind).toBe("done");
    if (out.kind === "done") {
      expect(out.extras.ingestNotices).toContainEqual({ kind: "ocr-failed" });
    }
  });

  it("maps API errors to messages", async () => {
    const { deps } = makeDeps({
      analyze: async () => ({ ok: false, code: "network-error" }),
    });
    const out = await runCheck(deps, textInput("hi"), noStatus);
    expect(out.kind).toBe("failed");
    if (out.kind === "failed") {
      expect(out.message.key).toBe("error.analyze.network-error");
      expect(out.message.technicalCode).toBe("network-error");
    }
  });

  it("maps rate-limited with the retry seconds", async () => {
    const { deps } = makeDeps({
      analyze: async () => ({ ok: false, code: "rate-limited", retryAfterSec: 12 }),
    });
    const out = await runCheck(deps, textInput("hi"), noStatus);
    expect(out.kind).toBe("failed");
    if (out.kind === "failed") {
      expect(out.message.key).toBe("error.analyze.rate-limited");
      expect(out.message.params).toEqual({ seconds: 12 });
    }
  });

  it("returns a generic failure when analyze throws", async () => {
    const { deps } = makeDeps({
      analyze: async () => {
        throw new Error("boom");
      },
    });
    const out = await runCheck(deps, textInput("hi"), noStatus);
    expect(out).toMatchObject({ kind: "failed", message: { key: "error.generic" } });
  });

  it("returns a generic failure when ingest throws", async () => {
    const { deps } = makeDeps({
      ingest: async () => {
        throw new Error("boom");
      },
    });
    const out = await runCheck(deps, fileInput("hi"), noStatus);
    expect(out).toMatchObject({ kind: "failed", message: { key: "error.generic" } });
  });

  it("returns a generic failure when the builder throws", async () => {
    const { deps } = makeDeps({
      build: () => {
        throw new Error("boom");
      },
    });
    const out = await runCheck(deps, textInput("hi"), noStatus);
    expect(out).toMatchObject({ kind: "failed", message: { key: "error.generic" } });
  });

  it("ignores a throwing status callback", async () => {
    const { deps } = makeDeps();
    const out = await runCheck(deps, textInput("hi"), () => {
      throw new Error("ui");
    });
    expect(out.kind).toBe("done");
  });

  it("returns inputText equal to request.text and the semantic mode", async () => {
    const { deps, calls } = makeDeps({
      analyze: async () => ({ ok: true, verdict: VERDICT, semanticMode: "not-configured" }),
    });
    const out = await runCheck(deps, fileInput("typed"), noStatus);
    expect(out.kind).toBe("done");
    if (out.kind === "done") {
      expect(out.inputText).toBe(calls.requests[0].text);
      expect(out.inputText).toBe("typed\nocr text");
      expect(out.verdict).toBe(VERDICT);
      expect(out.extras.semanticMode).toBe("not-configured");
      expect(out.extras.userText).toBe("typed");
    }
  });

  it("passes checkLinks to buildAnalyzeRequest and defaults it to false", async () => {
    const seen: (boolean | undefined)[] = [];
    const { deps } = makeDeps();
    const build = deps.buildAnalyzeRequest;
    deps.buildAnalyzeRequest = (i) => {
      seen.push(i.checkLinks);
      return build(i);
    };
    await runCheck(deps, { ...textInput("hi"), checkLinks: true }, noStatus);
    await runCheck(deps, textInput("hi"), noStatus);
    expect(seen).toEqual([true, false]);
  });

  it("copies reputationMode from the client result into extras", async () => {
    const { deps } = makeDeps({
      analyze: async () => ({
        ok: true,
        verdict: VERDICT,
        semanticMode: "used",
        reputationMode: "checked",
      }),
    });
    const out = await runCheck(deps, textInput("hi"), noStatus);
    expect(out.kind === "done" && out.extras.reputationMode).toBe("checked");
  });

  it("reports statuses in order for an image check", async () => {
    const { deps } = makeDeps();
    const seen: CheckStatus[] = [];
    await runCheck(deps, fileInput("hi"), (s) => seen.push(s));
    expect(seen[0]).toBe("preparing");
    expect(seen[seen.length - 1]).toBe("sending");
  });
});
