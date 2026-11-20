import { afterEach, describe, expect, it, vi } from "vitest";
import { REPUTATION_ENDPOINT } from "./reputation.config";
import { createSafeBrowsingProvider } from "./safe-browsing-provider";
import { toBase64Url } from "./url-expressions";

const bytes = (n: number, fill: number) => new Uint8Array(n).fill(fill);
const hashB64 = (fill: number) => Buffer.from(bytes(32, fill)).toString("base64");

type Captured = { url: string; init: RequestInit };

function capture(respond: () => Response | Promise<Response>) {
  const calls: Captured[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond();
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

const json = (body: unknown, status = 200) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
  });

function make(fetchImpl: typeof fetch, timeoutMs = 3000) {
  return createSafeBrowsingProvider({ apiKey: "KEY", timeoutMs, fetchImpl });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createSafeBrowsingProvider", () => {
  it("sends one GET with the documented wire format", async () => {
    const { calls, fetchImpl } = capture(() => json({}));
    const p1 = bytes(4, 0xff);
    const p2 = bytes(4, 0x00);
    await make(fetchImpl).searchHashes([p1, p2]);
    expect(calls).toHaveLength(1);
    const { url, init } = calls[0];
    const sorted = [toBase64Url(p1), toBase64Url(p2)].sort();
    expect(url).toBe(
      `${REPUTATION_ENDPOINT}?hashPrefixes=${sorted[0]}&hashPrefixes=${sorted[1]}`,
    );
    expect(init.method).toBe("GET");
    expect(init.headers).toEqual({
      "X-Goog-Api-Key": "KEY",
      Accept: "application/json",
    });
    expect(init.cache).toBe("no-store");
    expect(init.redirect).toBe("error");
    expect(init.credentials).toBe("omit");
    expect(init.referrerPolicy).toBe("no-referrer");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.body).toBeUndefined();
  });

  it("returns no matches for an empty 200 body", async () => {
    const { fetchImpl } = capture(() => json({}));
    expect(await make(fetchImpl).searchHashes([bytes(4, 1)])).toEqual({
      status: "ok",
      matches: [],
    });
  });

  it("returns matches with mapped categories", async () => {
    const { fetchImpl } = capture(() =>
      json({
        fullHashes: [
          {
            fullHash: hashB64(7),
            fullHashDetails: [
              { threatType: "MALWARE" },
              { threatType: "SOCIAL_ENGINEERING" },
            ],
          },
        ],
        cacheDuration: "300s",
      }),
    );
    const r = await make(fetchImpl).searchHashes([bytes(4, 1)]);
    expect(r).toEqual({
      status: "ok",
      matches: [
        { fullHash: bytes(32, 7), categories: ["malware", "social-engineering"] },
      ],
    });
  });

  it("maps an unknown threat type to other", async () => {
    const { fetchImpl } = capture(() =>
      json({
        fullHashes: [
          { fullHash: hashB64(7), fullHashDetails: [{ threatType: "NEW_KIND" }] },
        ],
      }),
    );
    const r = await make(fetchImpl).searchHashes([bytes(4, 1)]);
    expect(r).toMatchObject({
      status: "ok",
      matches: [{ categories: ["other"] }],
    });
  });

  it("disregards a detail that has any attribute (CANARY)", async () => {
    const { fetchImpl } = capture(() =>
      json({
        fullHashes: [
          {
            fullHash: hashB64(7),
            fullHashDetails: [{ threatType: "MALWARE", attributes: ["CANARY"] }],
          },
        ],
      }),
    );
    expect(await make(fetchImpl).searchHashes([bytes(4, 1)])).toEqual({
      status: "ok",
      matches: [],
    });
  });

  it("keeps the enforceable detail when another one has an attribute", async () => {
    const { fetchImpl } = capture(() =>
      json({
        fullHashes: [
          {
            fullHash: hashB64(7),
            fullHashDetails: [
              { threatType: "MALWARE", attributes: ["CANARY"] },
              { threatType: "SOCIAL_ENGINEERING" },
            ],
          },
        ],
      }),
    );
    const r = await make(fetchImpl).searchHashes([bytes(4, 1)]);
    expect(r).toMatchObject({ matches: [{ categories: ["social-engineering"] }] });
  });

  it("disregards an unspecified threat type", async () => {
    const { fetchImpl } = capture(() =>
      json({
        fullHashes: [
          {
            fullHash: hashB64(7),
            fullHashDetails: [{ threatType: "THREAT_TYPE_UNSPECIFIED" }],
          },
        ],
      }),
    );
    expect(await make(fetchImpl).searchHashes([bytes(4, 1)])).toEqual({
      status: "ok",
      matches: [],
    });
  });

  it("maps 429 to rate-limited", async () => {
    const { fetchImpl } = capture(() => json({}, 429));
    expect(await make(fetchImpl).searchHashes([bytes(4, 1)])).toEqual({
      status: "degraded",
      reason: "rate-limited",
    });
  });

  it.each([500, 503, 403, 404])("maps status %i to provider-error", async (s) => {
    const { calls, fetchImpl } = capture(() => json({}, s));
    expect(await make(fetchImpl).searchHashes([bytes(4, 1)])).toEqual({
      status: "degraded",
      reason: "provider-error",
    });
    expect(calls).toHaveLength(1); // no retry
  });

  it("maps a network error to provider-error", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await make(fetchImpl).searchHashes([bytes(4, 1)])).toEqual({
      status: "degraded",
      reason: "provider-error",
    });
  });

  it.each([
    ["bad JSON", "{not json"],
    ["wrong shape", { fullHashes: "x" }],
    ["short hash", { fullHashes: [{ fullHash: Buffer.from(bytes(31, 1)).toString("base64") }] }],
    ["long hash", { fullHashes: [{ fullHash: Buffer.from(bytes(33, 1)).toString("base64") }] }],
    ["undecodable hash", { fullHashes: [{ fullHash: "***" }] }],
  ])("maps %s to invalid-response", async (_name, body) => {
    const { fetchImpl } = capture(() => json(body));
    expect(await make(fetchImpl).searchHashes([bytes(4, 1)])).toEqual({
      status: "degraded",
      reason: "invalid-response",
    });
  });

  it("aborts and returns timeout when the provider hangs", async () => {
    vi.useFakeTimers();
    let seen: AbortSignal | undefined;
    const fetchImpl = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        seen = init.signal ?? undefined;
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      })) as unknown as typeof fetch;
    const pending = make(fetchImpl, 1000).searchHashes([bytes(4, 1)]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toEqual({ status: "degraded", reason: "timeout" });
    expect(seen?.aborted).toBe(true);
  });

  it("returns timeout when the caller signal is already aborted, without a request", async () => {
    const { calls, fetchImpl } = capture(() => json({}));
    const c = new AbortController();
    c.abort();
    expect(await make(fetchImpl).searchHashes([bytes(4, 1)], c.signal)).toEqual({
      status: "degraded",
      reason: "timeout",
    });
    expect(calls).toHaveLength(0);
  });
});

describe("createSafeBrowsingProvider protobuf body (the real v5 wire format)", () => {
  // Minimal protobuf writer for the test: FullHash{1: hash, 2: detail{1: type, 2: attributes}}.
  const varint = (n: number): number[] => {
    const out: number[] = [];
    let v = n;
    while (v >= 0x80) {
      out.push((v & 0x7f) | 0x80);
      v = Math.floor(v / 128);
    }
    out.push(v);
    return out;
  };
  const field = (no: number, payload: number[]): number[] => [...varint(no * 8 + 2), ...varint(payload.length), ...payload];
  const detail = (type: number, attrs: number[] = []): number[] =>
    field(2, [...varint(8), ...varint(type), ...attrs.flatMap((a) => [...varint(16), ...varint(a)])]);
  const fullHash = (fill: number, details: number[][]): number[] =>
    field(1, [...field(1, Array.from(bytes(32, fill))), ...details.flat()]);
  const duration = field(2, [8, 0x2c, 0x02]);
  const proto = (...parts: number[][]) =>
    new Response(new Uint8Array(parts.flat()), {
      status: 200,
      headers: { "content-type": "application/x-protobuf" },
    });

  it("reads a match with two threat types", async () => {
    const { fetchImpl } = capture(() => proto(fullHash(7, [detail(1), detail(4)]), duration));
    const r = await make(fetchImpl).searchHashes([bytes(4, 1)]);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.matches).toHaveLength(1);
    expect(Array.from(r.matches[0].fullHash)).toEqual(Array.from(bytes(32, 7)));
    expect(r.matches[0].categories).toEqual(["malware", "other"]);
  });

  it("maps social engineering and unwanted software", async () => {
    const { fetchImpl } = capture(() => proto(fullHash(1, [detail(2)]), fullHash(2, [detail(3)])));
    const r = await make(fetchImpl).searchHashes([bytes(4, 1)]);
    expect(r.status === "ok" && r.matches.map((m) => m.categories[0])).toEqual([
      "social-engineering",
      "unwanted-software",
    ]);
  });

  it("returns no matches for an empty body or only a cache duration", async () => {
    for (const body of [[], duration]) {
      const { fetchImpl } = capture(() => proto(body));
      expect(await make(fetchImpl).searchHashes([bytes(4, 1)])).toEqual({ status: "ok", matches: [] });
    }
  });

  it("disregards a detail with any attribute (CANARY) or an unspecified type", async () => {
    const { fetchImpl } = capture(() => proto(fullHash(1, [detail(1, [1]), detail(0)])));
    expect(await make(fetchImpl).searchHashes([bytes(4, 1)])).toEqual({ status: "ok", matches: [] });
  });

  it("treats an unknown threat type number as other", async () => {
    const { fetchImpl } = capture(() => proto(fullHash(1, [detail(99)])));
    const r = await make(fetchImpl).searchHashes([bytes(4, 1)]);
    expect(r.status === "ok" && r.matches[0].categories).toEqual(["other"]);
  });

  it("rejects a truncated body, a wrong hash length and random bytes", async () => {
    const whole = fullHash(1, [detail(1)]);
    const short = field(1, [...field(1, Array.from(bytes(10, 1))), ...detail(1)]);
    for (const body of [whole.slice(0, whole.length - 3), short, [0xff, 0xff, 0xff]]) {
      const { fetchImpl } = capture(() => proto(body));
      expect(await make(fetchImpl).searchHashes([bytes(4, 1)])).toEqual({
        status: "degraded",
        reason: "invalid-response",
      });
    }
  });
});
