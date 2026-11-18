import { describe, expect, it, vi } from "vitest";
import { FakeReputationProvider } from "./fake-reputation-provider";
import { createReputationChecker } from "./reputation-checker";
import { expressionsOf, prefixOf, sha256, toLookupUrl } from "./url-expressions";

const BAD = "http://bad.example.com/phish?x=1";
const OK = "http://fine.example.org/page";

describe("createReputationChecker", () => {
  it("makes no gate or provider call for empty and malformed lists", async () => {
    for (const urls of [[], ["", "not a url", "   "], [1, null, {}]]) {
      const provider = FakeReputationProvider.responding([]);
      const gate = vi.fn(() => true);
      const checker = createReputationChecker({ provider, gate });
      const r = await checker.check(urls as unknown as string[]);
      expect(r).toEqual({ status: "ok", hits: [], checkedCount: 0 });
      expect(gate).not.toHaveBeenCalled();
      expect(provider.calls).toHaveLength(0);
    }
  });

  it("calls the gate once and sends only 4-byte prefixes", async () => {
    const provider = FakeReputationProvider.listing([]);
    const gate = vi.fn(() => true);
    const r = await createReputationChecker({ provider, gate }).check([BAD, OK]);
    expect(gate).toHaveBeenCalledTimes(1);
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].prefixes.every((p) => p.length === 4)).toBe(true);
    expect(r).toEqual({ status: "ok", hits: [], checkedCount: 2 });
  });

  it("reports a listed URL with its category", async () => {
    const provider = FakeReputationProvider.listing([BAD], "malware");
    const r = await createReputationChecker({ provider, gate: () => true }).check([
      OK,
      BAD,
    ]);
    expect(r).toEqual({
      status: "ok",
      hits: [{ url: BAD, category: "malware" }],
      checkedCount: 2,
    });
  });

  it("does not treat a prefix match without a full-hash match as a hit", async () => {
    const lookup = toLookupUrl(BAD);
    if (lookup === null) throw new Error("fixture");
    const real = sha256(expressionsOf(lookup)[0]);
    const fake = real.slice();
    fake[31] ^= 0xff; // same 4-byte prefix, different full hash
    expect(prefixOf(fake)).toEqual(prefixOf(real));
    const provider = FakeReputationProvider.responding([
      { fullHash: fake, categories: ["social-engineering"] },
    ]);
    const r = await createReputationChecker({ provider, gate: () => true }).check([BAD]);
    expect(r).toEqual({ status: "ok", hits: [], checkedCount: 1 });
  });

  it("truncates to whole URLs and reports too-many-links", async () => {
    const urls = ["http://a.example.com/", "http://b.example.net/x/y/z/w"];
    const first = toLookupUrl(urls[0]);
    if (first === null) throw new Error("fixture");
    const maxPrefixes = expressionsOf(first).length;
    const provider = FakeReputationProvider.responding([]);
    const r = await createReputationChecker({
      provider,
      gate: () => true,
      maxPrefixes,
    }).check(urls);
    expect(r).toEqual({
      status: "ok",
      hits: [],
      checkedCount: 1,
      reason: "too-many-links",
    });
    expect(provider.calls[0].prefixes.length).toBeLessThanOrEqual(maxPrefixes);
  });

  it("gives too-many-links with zero calls when no URL fits", async () => {
    const provider = FakeReputationProvider.responding([]);
    const gate = vi.fn(() => true);
    const r = await createReputationChecker({ provider, gate, maxPrefixes: 0 }).check([BAD]);
    expect(r).toEqual({ status: "ok", hits: [], checkedCount: 0, reason: "too-many-links" });
    expect(gate).not.toHaveBeenCalled();
    expect(provider.calls).toHaveLength(0);
  });

  it("returns rate-limited when the gate denies or throws", async () => {
    for (const gate of [
      () => false,
      () => {
        throw new Error("budget");
      },
    ]) {
      const provider = FakeReputationProvider.responding([]);
      const r = await createReputationChecker({ provider, gate }).check([BAD]);
      expect(r).toEqual({ status: "degraded", reason: "rate-limited" });
      expect(provider.calls).toHaveLength(0);
    }
  });

  it("passes degraded provider results through and never rejects", async () => {
    const degraded = await createReputationChecker({
      provider: FakeReputationProvider.degraded("invalid-response"),
      gate: () => true,
    }).check([BAD]);
    expect(degraded).toEqual({ status: "degraded", reason: "invalid-response" });

    const thrown = await createReputationChecker({
      provider: FakeReputationProvider.throwing(),
      gate: () => true,
    }).check([BAD]);
    expect(thrown).toEqual({ status: "degraded", reason: "provider-error" });
  });

  it("forwards the abort signal to a hanging provider", async () => {
    const controller = new AbortController();
    const provider = FakeReputationProvider.hanging();
    const pending = createReputationChecker({ provider, gate: () => true }).check(
      [BAD],
      controller.signal,
    );
    controller.abort();
    expect(await pending).toEqual({ status: "degraded", reason: "timeout" });
    expect(provider.calls[0].hadSignal).toBe(true);
  });

  it("counts duplicate URLs once", async () => {
    const provider = FakeReputationProvider.responding([]);
    const r = await createReputationChecker({ provider, gate: () => true }).check([
      BAD,
      BAD,
    ]);
    expect(r).toMatchObject({ status: "ok", checkedCount: 1 });
  });
});
