import { describe, expect, it } from "vitest";
import { TextAnalyzer } from "../../analyzers/text-analyzer";
import { UrlAnalyzer } from "../../analyzers/url-analyzer";
import { parseLlmResponse } from "../../analyzers/semantic-analyzer";
import { evidenceNeedles, shortEvidence } from "./evidence";

async function urlSignal(url: string, id: string) {
  const signals = await new UrlAnalyzer().analyze(url);
  const s = signals.find((x) => x.id === id);
  if (s === undefined) throw new Error(`no ${id} for ${url}`);
  return s;
}

describe("evidenceNeedles", () => {
  it("text signals: full evidence plus each phrase", async () => {
    const signals = await new TextAnalyzer().analyze(
      "Your account has been locked. Act now and send money",
    );
    const urgency = signals.find((s) => s.id === "text.urgency");
    expect(urgency).toBeDefined();
    const needles = evidenceNeedles(urgency!);
    expect(needles[0]).toBe(urgency!.evidence);
    expect(needles).toContain("act now");

    const threat = signals.find((s) => s.id === "text.threat")!;
    expect(evidenceNeedles(threat)).toEqual(["account has been locked"]);
  });

  it("text signals with several phrases split on comma", () => {
    expect(
      evidenceNeedles({ id: "text.urgency", evidence: "act now, urgent" }),
    ).toEqual(["act now, urgent", "act now", "urgent"]);
  });

  it("url.credential-keywords adds the path", async () => {
    const s = await urlSignal("http://example.com/login/verify", "url.credential-keywords");
    expect(evidenceNeedles(s)).toEqual([s.evidence, "/login/verify"]);
  });

  it("url.brand-lookalike adds the stem", async () => {
    const s = await urlSignal("http://paypa1.com/", "url.brand-lookalike");
    expect(evidenceNeedles(s)).toEqual([s.evidence, "paypa1"]);
  });

  it("url.excessive-subdomains drops the parts suffix", async () => {
    const s = await urlSignal("http://a.b.c.example.com/", "url.excessive-subdomains");
    expect(evidenceNeedles(s)).toEqual([s.evidence, "a.b.c.example.com"]);
  });

  it.each([
    ["http://xn--pypal-4ve.com/", "url.punycode-host"],
    ["http://user@evil.com/", "url.at-in-authority"],
    ["http://192.168.1.1/", "url.ip-address-host"],
    ["http://bit.ly/abc", "url.known-shortener"],
  ])("%s gives the evidence only for %s", async (url, id) => {
    const s = await urlSignal(url, id);
    expect(evidenceNeedles(s)).toEqual([s.evidence]);
  });

  it("semantic signals give the evidence only", () => {
    const raw = JSON.stringify({
      signals: [
        { id: "semantic.isolation-secrecy", severity: 0.3, evidence: "Do not tell anyone" },
      ],
    });
    const [s] = parseLlmResponse(raw, "Please. Do not tell anyone about this.");
    expect(s).toBeDefined();
    expect(evidenceNeedles(s!)).toEqual(["Do not tell anyone"]);
  });

  it("drops blanks and duplicates, and tolerates bad input", () => {
    expect(evidenceNeedles({ id: "text.x", evidence: "a, a, " })).toEqual(["a, a,", "a"]);
    expect(evidenceNeedles({ id: "text.x", evidence: "   " })).toEqual([]);
    expect(evidenceNeedles({ id: "x", evidence: 5 as unknown as string })).toEqual([]);
    expect(evidenceNeedles(null as unknown as { id: string; evidence: string })).toEqual([]);
  });
});

describe("shortEvidence", () => {
  it("collapses whitespace and trims", () => {
    expect(shortEvidence("  a \n\t b  ")).toBe("a b");
  });

  it("keeps exactly 80 code points without an ellipsis", () => {
    const s = "x".repeat(80);
    expect(shortEvidence(s)).toBe(s);
  });

  it("cuts at 80 code points and adds an ellipsis", () => {
    expect(shortEvidence("x".repeat(81))).toBe("x".repeat(80) + "…");
  });

  it("counts code points, not UTF-16 units", () => {
    const out = shortEvidence("😀".repeat(81));
    expect(out).toBe("😀".repeat(80) + "…");
  });

  it("returns an empty string for non-strings", () => {
    expect(shortEvidence(undefined as unknown as string)).toBe("");
  });
});
