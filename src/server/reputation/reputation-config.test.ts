import { describe, expect, it } from "vitest";
import { readReputationConfig } from "./reputation-config";
import {
  MAX_PREFIXES_PER_REQUEST,
  REPUTATION_CONFIG_LIMITS,
  REPUTATION_ENDPOINT,
} from "./reputation.config";

const KEY = "fake-key-123";

function env(o: Record<string, string | undefined> = {}) {
  return { LINK_REPUTATION_API_KEY: KEY, ...o };
}

describe("reputation.config", () => {
  it("fixes endpoint and prefix cap", () => {
    expect(REPUTATION_ENDPOINT).toBe(
      "https://safebrowsing.googleapis.com/v5/hashes:search",
    );
    expect(MAX_PREFIXES_PER_REQUEST).toBe(100);
  });
});

describe("readReputationConfig", () => {
  it("returns the defaults table for a key only", () => {
    const c = readReputationConfig(env());
    expect(c.state).toBe("ready");
    expect(c.apiKey).toBe(KEY);
    expect(c.timeoutMs).toBe(3000);
    expect(c.callsPerMinute).toBe(10);
    expect(c.callsPerDay).toBe(2000);
    expect(REPUTATION_CONFIG_LIMITS.timeoutMs).toEqual({ default: 3000, min: 500, max: 6000 });
  });

  it("uses defaults for blank, non-string and non-digit numbers", () => {
    for (const bad of ["", "   ", "abc", "1.5", "-3", "+3", "1e3", "０５"]) {
      const c = readReputationConfig(
        env({
          LINK_REPUTATION_TIMEOUT_MS: bad,
          LINK_REPUTATION_CALLS_PER_MINUTE: bad,
          LINK_REPUTATION_CALLS_PER_DAY: bad,
        }),
      );
      expect([c.timeoutMs, c.callsPerMinute, c.callsPerDay]).toEqual([3000, 10, 2000]);
    }
    const weird = { LINK_REPUTATION_API_KEY: KEY, LINK_REPUTATION_TIMEOUT_MS: 5000 } as unknown as Record<string, string>;
    expect(readReputationConfig(weird).timeoutMs).toBe(3000);
  });

  it("clamps out-of-range integers", () => {
    const hi = readReputationConfig(
      env({
        LINK_REPUTATION_TIMEOUT_MS: "99999",
        LINK_REPUTATION_CALLS_PER_MINUTE: "500",
        LINK_REPUTATION_CALLS_PER_DAY: "99999",
      }),
    );
    expect([hi.timeoutMs, hi.callsPerMinute, hi.callsPerDay]).toEqual([6000, 60, 10000]);
    const lo = readReputationConfig(env({ LINK_REPUTATION_TIMEOUT_MS: "10" }));
    expect(lo.timeoutMs).toBe(500);
  });

  it("clamps long digit strings instead of using the default", () => {
    const run = (v: string) => {
      const c = readReputationConfig(
        env({
          LINK_REPUTATION_TIMEOUT_MS: v,
          LINK_REPUTATION_CALLS_PER_MINUTE: v,
          LINK_REPUTATION_CALLS_PER_DAY: v,
        }),
      );
      return [c.timeoutMs, c.callsPerMinute, c.callsPerDay];
    };
    expect(run("1234567890")).toEqual([6000, 60, 10000]);
    expect(run("99999999999")).toEqual([6000, 60, 10000]);
    expect(run("9".repeat(40))).toEqual([6000, 60, 10000]);
    expect(run("0000000000")).toEqual([500, 0, 0]);
    expect(run("00000000000000000000042")).toEqual([500, 42, 42]);
  });

  it("accepts padded digits", () => {
    expect(readReputationConfig(env({ LINK_REPUTATION_TIMEOUT_MS: " 1200 " })).timeoutMs).toBe(1200);
  });

  it("is off when either call limit is 0", () => {
    expect(readReputationConfig(env({ LINK_REPUTATION_CALLS_PER_MINUTE: "0" })).state).toBe("off");
    expect(readReputationConfig(env({ LINK_REPUTATION_CALLS_PER_DAY: "0" })).state).toBe("off");
    expect(readReputationConfig(env({ LINK_REPUTATION_CALLS_PER_DAY: "0" })).apiKey).toBe("");
  });

  it("is not-configured for a missing, blank or non-string key", () => {
    expect(readReputationConfig({}).state).toBe("not-configured");
    expect(readReputationConfig(env({ LINK_REPUTATION_API_KEY: "  " })).state).toBe("not-configured");
    const num = { LINK_REPUTATION_API_KEY: 42 } as unknown as Record<string, string>;
    expect(readReputationConfig(num).state).toBe("not-configured");
    expect(readReputationConfig(num).apiKey).toBe("");
  });

  it("not-configured wins over off", () => {
    expect(readReputationConfig({ LINK_REPUTATION_CALLS_PER_DAY: "0" }).state).toBe("not-configured");
  });

  it("never throws for a bad env", () => {
    for (const bad of [null, 5, "x", []]) {
      const c = readReputationConfig(bad as unknown as Record<string, string>);
      expect(c.state).toBe("not-configured");
      expect(c.timeoutMs).toBe(3000);
    }
    const throwing = new Proxy({}, { get() { throw new Error("boom"); } });
    expect(readReputationConfig(throwing as Record<string, string>).state).toBe("not-configured");
  });

  it("keeps the api key out of serialization", () => {
    const c = readReputationConfig(env());
    expect(JSON.stringify(c)).not.toContain(KEY);
    expect(JSON.stringify({ ...c })).not.toContain(KEY);
    expect(Object.keys(c)).not.toContain("apiKey");
  });
});
