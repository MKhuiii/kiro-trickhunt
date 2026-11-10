import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeLlmClient } from "../analyzers/fake-llm-client";
import { TextAnalyzer } from "../analyzers/text-analyzer";
import { UrlAnalyzer } from "../analyzers/url-analyzer";
import { createPipeline } from "./pipeline";
import {
  ACTIONS_FALLBACK,
  LIMITATIONS_DEGRADED,
  LIMITATIONS_NO_SIGNALS,
  LIMITATIONS_UNAVAILABLE,
} from "./messages.config";
import type { Verdict } from "./verdict";

const RANK = { no_signals: 0, suspicious: 1, high: 2, critical: 3 } as const;

const BANK_TEXT =
  "Urgent: your account has been locked. Enter your OTP now to unlock it.";
const BANK_URL = "http://paypa1.com/verify";
const IP_URL = "http://192.168.1.1/login";
// Mild text: rules-only result is not critical, so the semantic layer runs.
const MILD_TEXT = "Act now, this is urgent";

function semanticResponse(
  entries: { id: string; severity: number; evidence: string }[],
): string {
  return JSON.stringify({ signals: entries });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createPipeline — example tests (requirements 8.1)", () => {
  it("bank phishing sample is critical with the bank monster", async () => {
    const pipeline = createPipeline({ llmClient: null });
    const v = await pipeline.run({ text: BANK_TEXT, urls: [BANK_URL] });
    expect(v.level).toBe("critical");
    expect(v.monster).toBe("bank");
    expect(v.signals.length).toBeGreaterThan(0);
  });

  it("benign meeting message has no signals", async () => {
    const pipeline = createPipeline({ llmClient: null });
    const v = await pipeline.run({
      text: "Hi team, the meeting is moved to 3pm tomorrow in room B.",
    });
    expect(v.level).toBe("no_signals");
    expect(v.riskScore).toBe(0);
    expect(v.monster).toBeNull();
    expect(v.actions).toEqual(ACTIONS_FALLBACK.en);
    expect(v.actions).toHaveLength(1);
    for (const l of LIMITATIONS_NO_SIGNALS.en) {
      expect(v.limitations).toContain(l);
    }
  });

  it("IP-only URL is suspicious or higher with the generic monster", async () => {
    const pipeline = createPipeline({ llmClient: null });
    const v = await pipeline.run({ text: `Look at ${IP_URL}` });
    expect(RANK[v.level]).toBeGreaterThanOrEqual(RANK.suspicious);
    expect(v.monster).toBe("generic");
    expect(v.urlsAnalyzed).toBe(1);
  });

  it("rules-only critical skips the client", async () => {
    const client = FakeLlmClient.responding(semanticResponse([]));
    const pipeline = createPipeline({ llmClient: client });
    const v = await pipeline.run({ text: BANK_TEXT, urls: [BANK_URL] });
    expect(v.level).toBe("critical");
    expect(client.callCount).toBe(0);
    expect(v.semantic).toEqual({ status: "ok", skipped: true });
  });

  it("overlapping urgency and semantic pressure do not inflate the score", async () => {
    const baseline = await createPipeline({ llmClient: null }).run({
      text: MILD_TEXT,
    });
    const client = FakeLlmClient.responding(
      semanticResponse([
        {
          id: "semantic.pressure-escalation",
          severity: 0.5,
          evidence: "this is urgent",
        },
      ]),
    );
    const v = await createPipeline({ llmClient: client }).run({
      text: MILD_TEXT,
    });
    expect(client.callCount).toBe(1);
    expect(v.semantic).toEqual({ status: "ok", skipped: false });
    const ids = v.signals.map((s) => s.id);
    expect(ids).toContain("text.urgency");
    expect(ids).toContain("semantic.pressure-escalation");
    const urgency = baseline.signals.find((s) => s.id === "text.urgency");
    expect(urgency).toBeDefined();
    // semantic severity (0.5) does not exceed the text signal's severity
    expect(urgency!.severity).toBeGreaterThanOrEqual(0.5);
    expect(v.riskScore).toBe(baseline.riskScore);
  });

  it("sensitive-data request plus a URL signal is at least high", async () => {
    const v = await createPipeline({ llmClient: null }).run({
      text: "Please reply with your card number",
      urls: [IP_URL],
    });
    expect(v.signals.some((s) => s.id === "text.sensitive-data-request")).toBe(
      true,
    );
    expect(v.signals.some((s) => s.id.startsWith("url."))).toBe(true);
    expect(RANK[v.level]).toBeGreaterThanOrEqual(RANK.high);
  });

  it("blank text and no URLs call no analyzer and no client", async () => {
    const textSpy = vi.spyOn(TextAnalyzer.prototype, "analyze");
    const urlSpy = vi.spyOn(UrlAnalyzer.prototype, "analyze");
    const client = FakeLlmClient.responding(semanticResponse([]));
    const v = await createPipeline({ llmClient: client }).run({
      text: "   \n\t ",
      urls: ["", "   "],
    });
    expect(v.level).toBe("no_signals");
    expect(v.riskScore).toBe(0);
    expect(v.monster).toBeNull();
    expect(v.signals).toHaveLength(0);
    expect(textSpy).not.toHaveBeenCalled();
    expect(urlSpy).not.toHaveBeenCalled();
    expect(client.callCount).toBe(0);
  });
});

describe("createPipeline — semantic layer states", () => {
  const cases: {
    name: string;
    make: () => FakeLlmClient;
    reason: "client-error" | "invalid-response" | "timeout";
  }[] = [
    {
      name: "client throws",
      make: () => FakeLlmClient.throwing(),
      reason: "client-error",
    },
    {
      name: "client rejects",
      make: () => FakeLlmClient.rejecting(),
      reason: "client-error",
    },
    {
      name: "client returns invalid JSON",
      make: () => FakeLlmClient.responding("not json at all"),
      reason: "invalid-response",
    },
    {
      name: "client never resolves",
      make: () => FakeLlmClient.neverResolving(),
      reason: "timeout",
    },
  ];

  for (const c of cases) {
    it(`${c.name} gives degraded/${c.reason} and keeps rule signals`, async () => {
      const client = c.make();
      const v = await createPipeline({
        llmClient: client,
        semanticTimeoutMs: 10,
      }).run({ text: MILD_TEXT });
      expect(client.callCount).toBe(1);
      expect(v.semantic).toEqual({
        status: "degraded",
        reason: c.reason,
        skipped: false,
      });
      expect(v.signals.some((s) => s.id === "text.urgency")).toBe(true);
      expect(v.riskScore).toBeGreaterThan(0);
      for (const l of LIMITATIONS_DEGRADED.en) {
        expect(v.limitations).toContain(l);
      }
    });
  }

  it("skipped by policy is ok/skipped, never degraded", async () => {
    const client = FakeLlmClient.responding(semanticResponse([]));
    const v = await createPipeline({ llmClient: client }).run({
      text: BANK_TEXT,
      urls: [BANK_URL],
    });
    expect(v.semantic.status).toBe("ok");
    expect(v.semantic.skipped).toBe(true);
    expect(v.semantic.reason).toBeUndefined();
  });

  it("null client gives unavailable and still scores", async () => {
    const v = await createPipeline({ llmClient: null }).run({
      text: MILD_TEXT,
    });
    expect(v.semantic).toEqual({ status: "unavailable", skipped: false });
    expect(v.riskScore).toBeGreaterThan(0);
    for (const l of LIMITATIONS_UNAVAILABLE.en) {
      expect(v.limitations).toContain(l);
    }
  });

  it("concurrent runs with different clients keep their own status", async () => {
    const good = FakeLlmClient.responding(semanticResponse([]));
    const bad = FakeLlmClient.throwing();
    const hang = FakeLlmClient.neverResolving();
    const [a, b, c, d] = await Promise.all([
      createPipeline({ llmClient: good, semanticTimeoutMs: 20 }).run({
        text: MILD_TEXT,
      }),
      createPipeline({ llmClient: bad, semanticTimeoutMs: 20 }).run({
        text: MILD_TEXT,
      }),
      createPipeline({ llmClient: hang, semanticTimeoutMs: 20 }).run({
        text: MILD_TEXT,
      }),
      createPipeline({ llmClient: null }).run({ text: MILD_TEXT }),
    ]);
    expect(a.semantic).toEqual({ status: "ok", skipped: false });
    expect(b.semantic).toEqual({
      status: "degraded",
      reason: "client-error",
      skipped: false,
    });
    expect(c.semantic).toEqual({
      status: "degraded",
      reason: "timeout",
      skipped: false,
    });
    expect(d.semantic).toEqual({ status: "unavailable", skipped: false });
  });

  it("concurrent runs on one pipeline keep their own status", async () => {
    const client = FakeLlmClient.responding(semanticResponse([]));
    const pipeline = createPipeline({ llmClient: client });
    const [a, b] = await Promise.all([
      pipeline.run({ text: MILD_TEXT }),
      pipeline.run({ text: BANK_TEXT, urls: [BANK_URL] }),
    ]);
    expect(a.semantic).toEqual({ status: "ok", skipped: false });
    expect(b.semantic).toEqual({ status: "ok", skipped: true });
  });
});

describe("createPipeline — output shape", () => {
  it("returns a frozen verdict with frozen arrays and signals", async () => {
    const v: Verdict = await createPipeline({ llmClient: null }).run({
      text: BANK_TEXT,
      urls: [BANK_URL],
    });
    expect(Object.isFrozen(v)).toBe(true);
    expect(Object.isFrozen(v.signals)).toBe(true);
    expect(Object.isFrozen(v.actions)).toBe(true);
    expect(Object.isFrozen(v.limitations)).toBe(true);
    expect(Object.isFrozen(v.semantic)).toBe(true);
    for (const s of v.signals) expect(Object.isFrozen(s)).toBe(true);
  });

  it("signals are sorted by severity descending", async () => {
    const v = await createPipeline({ llmClient: null }).run({
      text: BANK_TEXT,
      urls: [BANK_URL],
    });
    for (let i = 1; i < v.signals.length; i++) {
      expect(v.signals[i - 1].severity).toBeGreaterThanOrEqual(
        v.signals[i].severity,
      );
    }
  });

  it("vi locale returns different action and limitation text from en", async () => {
    const en = await createPipeline({ llmClient: null, locale: "en" }).run({
      text: MILD_TEXT,
    });
    const vi_ = await createPipeline({ llmClient: null, locale: "vi" }).run({
      text: MILD_TEXT,
    });
    expect(vi_.actions.length).toBeGreaterThan(0);
    expect(vi_.limitations.length).toBeGreaterThan(0);
    expect(vi_.actions).not.toEqual(en.actions);
    expect(vi_.limitations).not.toEqual(en.limitations);
  });

  it("unknown locale falls back to en", async () => {
    const en = await createPipeline({ llmClient: null }).run({
      text: MILD_TEXT,
    });
    const odd = await createPipeline({
      llmClient: null,
      locale: "fr" as unknown as "en",
    }).run({ text: MILD_TEXT });
    expect(odd.actions).toEqual(en.actions);
  });
});
