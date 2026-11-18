/**
 * analyze-handler.reputation.property.test.ts
 *
 * Feature: link-reputation-check, Property 118: Without consent nothing is looked up (PBT-118)
 * Feature: link-reputation-check, Property 119: `checkLinks` accepts only the booleans (PBT-119)
 * **Validates: Requirements REQ-LREP-03, REQ-LREP-10 to REQ-LREP-12, REQ-LREP-16,
 * REQ-LREP-17, REQ-LREP-34**
 *
 * Feature: link-reputation-check, Property 124: denied or throwing budget gives 200, a rule-based verdict and no provider call (PBT-124, handler part)
 * Feature: link-reputation-check, Property 117: privacy of logs and responses (PBT-117, handler part)
 * **Validates: Requirements REQ-LREP-07, REQ-LREP-14, REQ-LREP-28**
 *
 * No network: real pipeline without an LLM client, fake checker and budget.
 * The PBT-124 and PBT-117 tests at the end use the real checker and provider
 * over a capturing fake `fetch`.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { fakeFetchCapturing } from "../reputation/fake-reputation-provider";
import { createReputationChecker } from "../reputation/reputation-checker";
import { createSafeBrowsingProvider } from "../reputation/safe-browsing-provider";
import {
  expressionsOf,
  prefixOf,
  sha256,
  toBase64Url,
  toLookupUrl,
} from "../reputation/url-expressions";
import type { AnalyzeLogEvent } from "./log-event";
import { createPipeline } from "../../pipeline";
import type { Pipeline, PipelineOptions } from "../../pipeline";
import type {
  ReputationChecker,
  ReputationResult,
} from "../../analyzers/reputation-checker";
import { createAnalyzeHandler } from "./analyze-handler";
import type { AnalyzeHandlerDeps } from "./analyze-handler";

const NUM_RUNS = 100;

interface Counters {
  checkerCalls: number;
  createCheckerCalls: number;
  acquireCalls: number;
  pipelineCalls: number;
}

interface Harness {
  readonly handler: (req: Request) => Promise<Response>;
  readonly counters: Counters;
}

function makeHarness(withReputation: boolean): Harness {
  const counters: Counters = {
    checkerCalls: 0,
    createCheckerCalls: 0,
    acquireCalls: 0,
    pipelineCalls: 0,
  };
  let clock = 1_000_000;
  const deps: AnalyzeHandlerDeps = {
    getLlmClient: () => null,
    createPipeline: (options: PipelineOptions): Pipeline => {
      counters.pipelineCalls += 1;
      return createPipeline(options);
    },
    rateLimiter: { check: () => ({ allowed: true, retryAfterSec: 1 }) },
    llmBudget: { tryAcquire: () => true },
    now: () => (clock += 1),
    logEvent: () => undefined,
    ...(withReputation
      ? {
          reputation: {
            createChecker: (gate: () => boolean): ReputationChecker => {
              counters.createCheckerCalls += 1;
              return {
                check: async (): Promise<ReputationResult> => {
                  counters.checkerCalls += 1;
                  gate();
                  return { status: "ok", hits: [], checkedCount: 0 };
                },
              };
            },
            budget: {
              tryAcquire: () => {
                counters.acquireCalls += 1;
                return true;
              },
            },
          },
        }
      : {}),
  };
  return { handler: createAnalyzeHandler(deps), counters };
}

function jsonPost(payload: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---------- arbitraries ----------

const textArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0);
const urlsArb = fc.array(fc.webUrl(), { minLength: 1, maxLength: 4 });

const validBodyArb = fc
  .oneof(
    fc.record({ text: textArb }),
    fc.record({ urls: urlsArb }),
    fc.record({ text: textArb, urls: urlsArb }),
  )
  .chain((body) =>
    fc.option(fc.constantFrom("vi" as const, "en" as const), { nil: undefined }).map(
      (locale) => (locale === undefined ? body : { ...body, locale }),
    ),
  );

describe("PBT-118: without consent nothing is looked up", () => {
  it("Feature: link-reputation-check, Property 118: absent or false checkLinks gives no lookup and an unchanged verdict", async () => {
    await fc.assert(
      fc.asyncProperty(
        validBodyArb,
        fc.constantFrom(undefined, false),
        async (body, checkLinks) => {
          const withRep = makeHarness(true);
          const without = makeHarness(false);
          const payload = checkLinks === undefined ? body : { ...body, checkLinks };

          const res = await withRep.handler(jsonPost(payload));
          const baseline = await without.handler(jsonPost(payload));

          expect(res.status).toBe(200);
          expect(withRep.counters.checkerCalls).toBe(0);
          expect(withRep.counters.createCheckerCalls).toBe(0);
          expect(withRep.counters.acquireCalls).toBe(0);

          const json = (await res.json()) as {
            verdict: Record<string, unknown>;
            meta: { reputationMode: string };
          };
          const base = (await baseline.json()) as typeof json;
          expect(json.meta.reputationMode).toBe("not-requested");
          expect(json.verdict.reputation).toEqual({
            status: "not-requested",
            checkedCount: 0,
          });
          expect(json.verdict.signals).toEqual(base.verdict.signals);
          expect(json.verdict.level).toBe(base.verdict.level);
          expect(json.verdict.riskScore).toBe(base.verdict.riskScore);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("PBT-119: checkLinks accepts only the booleans", () => {
  it("Feature: link-reputation-check, Property 119: non-boolean checkLinks gives 400 invalid-input without pipeline or budget", async () => {
    const badValueArb = fc
      .oneof(
        fc.anything(),
        fc.constantFrom<unknown>(null, "true", "false", 1, 0, [], {}, [true], { a: true }),
      )
      .filter((v) => typeof v !== "boolean" && v !== undefined);

    await fc.assert(
      fc.asyncProperty(validBodyArb, badValueArb, async (body, bad) => {
        const h = makeHarness(true);
        const res = await h.handler(jsonPost({ ...body, checkLinks: bad }));
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: { code: "invalid-input" } });
        expect(h.counters.pipelineCalls).toBe(0);
        expect(h.counters.acquireCalls).toBe(0);
        expect(h.counters.checkerCalls).toBe(0);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("Feature: link-reputation-check, Property 119: checkLinks without text or urls gives 400 invalid-input", async () => {
    const emptyBodyArb = fc.oneof(
      fc.constant({}),
      fc.record({ text: fc.constantFrom("", " ", "\n\t  ") }),
      fc.record({ urls: fc.constant([] as string[]) }),
      fc.record({
        text: fc.constantFrom("", "   "),
        urls: fc.constant([] as string[]),
      }),
    );
    await fc.assert(
      fc.asyncProperty(emptyBodyArb, fc.boolean(), async (body, checkLinks) => {
        const h = makeHarness(true);
        const res = await h.handler(jsonPost({ ...body, checkLinks }));
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: { code: "invalid-input" } });
        expect(h.counters.pipelineCalls).toBe(0);
        expect(h.counters.acquireCalls).toBe(0);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("Feature: link-reputation-check, Property 119: a valid body with true or false never gives 400", async () => {
    await fc.assert(
      fc.asyncProperty(validBodyArb, fc.boolean(), async (body, checkLinks) => {
        const h = makeHarness(true);
        const res = await h.handler(jsonPost({ ...body, checkLinks }));
        expect(res.status).not.toBe(400);
        expect(res.status).toBe(200);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------- real checker and provider over a capturing fake fetch ----------

const MARKERS = {
  userinfo: "usermark7",
  host: "hostmark7",
  path: "pathmark7",
  query: "querymark7",
  fragment: "fragmark7",
  text: "textmark7",
} as const;
const API_KEY = "apikeymark9";

const segmentArb = fc.string({
  unit: fc.constantFrom(..."abcdefghijklmnop"),
  minLength: 0,
  maxLength: 6,
});

const markedUrlArb = fc
  .record({
    scheme: fc.constantFrom("http", "https"),
    withUserinfo: fc.boolean(),
    sub: fc.array(
      fc.string({ unit: fc.constantFrom(..."abcdefghij"), minLength: 1, maxLength: 5 }),
      { minLength: 0, maxLength: 2 },
    ),
    pathSegments: fc.array(segmentArb, { minLength: 0, maxLength: 3 }),
    withQuery: fc.boolean(),
    withFragment: fc.boolean(),
  })
  .map((p) => {
    const userinfo = p.withUserinfo ? `${MARKERS.userinfo}:${MARKERS.userinfo}@` : "";
    const host = `${[...p.sub, MARKERS.host, "example"].join(".")}.com`;
    const path = `/${[...p.pathSegments, MARKERS.path].join("/")}`;
    const query = p.withQuery ? `?k=${MARKERS.query}` : "";
    const fragment = p.withFragment ? `#${MARKERS.fragment}` : "";
    return `${p.scheme}://${userinfo}${host}${path}${query}${fragment}`;
  });

const markedUrlsArb = fc.array(markedUrlArb, { minLength: 1, maxLength: 4 });
const markedTextArb = fc
  .string({ unit: fc.constantFrom(..."abc def."), minLength: 0, maxLength: 20 })
  .map((s) => `${MARKERS.text} ${s}`);

type BudgetKind = "grant" | "deny" | "throw";

interface RealHarness {
  readonly handler: (req: Request) => Promise<Response>;
  readonly fetchCalls: { url: string }[];
  readonly logs: AnalyzeLogEvent[];
  readonly acquired: { count: number };
}

function makeRealHarness(
  kind: BudgetKind | null,
  responseFactory: () => Response,
): RealHarness {
  const { fetchImpl, calls } = fakeFetchCapturing(responseFactory);
  const logs: AnalyzeLogEvent[] = [];
  const acquired = { count: 0 };
  let clock = 1_000_000;
  const deps: AnalyzeHandlerDeps = {
    getLlmClient: () => null,
    createPipeline,
    rateLimiter: { check: () => ({ allowed: true, retryAfterSec: 1 }) },
    llmBudget: { tryAcquire: () => true },
    now: () => (clock += 1),
    logEvent: (e) => {
      logs.push(e);
    },
    ...(kind === null
      ? {}
      : {
          reputation: {
            createChecker: (gate: () => boolean): ReputationChecker =>
              createReputationChecker({
                provider: createSafeBrowsingProvider({
                  apiKey: API_KEY,
                  timeoutMs: 1000,
                  fetchImpl,
                }),
                gate,
              }),
            budget: {
              tryAcquire: () => {
                acquired.count += 1;
                if (kind === "throw") throw new Error("budget failure");
                return kind === "grant";
              },
            },
          },
        }),
  };
  return { handler: createAnalyzeHandler(deps), fetchCalls: calls, logs, acquired };
}

describe("PBT-124 (handler part): denied or throwing budget", () => {
  it("Feature: link-reputation-check, Property 124: denied or throwing budget gives 200, the rule-based verdict and zero provider calls", async () => {
    await fc.assert(
      fc.asyncProperty(
        markedTextArb,
        markedUrlsArb,
        fc.constantFrom<BudgetKind>("deny", "throw"),
        async (text, urls, kind) => {
          const denied = makeRealHarness(kind, () => new Response("{}", { status: 200 }));
          const baseline = makeRealHarness(null, () => new Response("{}", { status: 200 }));
          const payload = { text, urls, checkLinks: true };

          const res = await denied.handler(jsonPost(payload));
          const base = await baseline.handler(jsonPost({ text, urls }));

          expect(res.status).toBe(200);
          expect(denied.fetchCalls).toHaveLength(0);
          expect(denied.acquired.count).toBeLessThanOrEqual(1);

          const json = (await res.json()) as {
            verdict: Record<string, unknown>;
            meta: { reputationMode: string };
          };
          const baseJson = (await base.json()) as typeof json;
          const { reputation, ...rest } = json.verdict;
          const { reputation: _ignored, ...baseRest } = baseJson.verdict;
          void _ignored;
          expect(rest).toEqual(baseRest);
          expect(reputation).toMatchObject({ status: "degraded" });
          expect(json.meta.reputationMode).toBe("budget-exhausted");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("Feature: link-reputation-check, Property 124: the budget is acquired at most once and never without consent", async () => {
    await fc.assert(
      fc.asyncProperty(
        markedTextArb,
        markedUrlsArb,
        fc.constantFrom(true, false, undefined),
        async (text, urls, checkLinks) => {
          const h = makeRealHarness("grant", () => new Response("{}", { status: 200 }));
          const payload = checkLinks === undefined ? { text, urls } : { text, urls, checkLinks };
          const res = await h.handler(jsonPost(payload));
          expect(res.status).toBe(200);
          expect(h.acquired.count).toBe(checkLinks === true ? 1 : 0);
          expect(h.fetchCalls).toHaveLength(checkLinks === true ? 1 : 0);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("PBT-117 (handler part): privacy of the outbound request, logs and responses", () => {
  it("Feature: link-reputation-check, Property 117: no marker, expression, hash or prefix leaves in the request, logs or reputation response", async () => {
    await fc.assert(
      fc.asyncProperty(
        markedTextArb,
        markedUrlsArb,
        fc.boolean(),
        async (text, urls, listed) => {
          const expressions: string[] = [];
          const hashes: Uint8Array[] = [];
          for (const url of urls) {
            const lookup = toLookupUrl(url);
            if (lookup === null) continue;
            for (const expression of expressionsOf(lookup)) {
              expressions.push(expression);
              hashes.push(sha256(expression));
            }
          }
          const body = listed
            ? JSON.stringify({
                fullHashes: hashes.map((h) => ({
                  fullHash: toBase64Url(h),
                  fullHashDetails: [{ threatType: "SOCIAL_ENGINEERING" }],
                })),
              })
            : "{}";
          const h = makeRealHarness("grant", () => new Response(body, { status: 200 }));

          const res = await h.handler(jsonPost({ text, urls, checkLinks: true }));
          expect(res.status).toBe(200);
          const raw = await res.text();
          const json = JSON.parse(raw) as { verdict: { reputation: unknown }; meta: unknown };

          // Outbound request: only the key and prefixes, no input text.
          expect(h.fetchCalls.length).toBeLessThanOrEqual(1);
          for (const call of h.fetchCalls) {
            const url = new URL(call.url);
            expect(url.host).toBe("safebrowsing.googleapis.com");
            const lower = call.url.toLowerCase();
            for (const marker of Object.values(MARKERS)) {
              expect(lower).not.toContain(marker);
            }
            expect(lower).not.toContain(API_KEY);
          }

          // Reputation part of the response, meta and log events.
          const surfaces = [
            JSON.stringify(json.verdict.reputation),
            JSON.stringify(json.meta),
            ...h.logs.map((e) => JSON.stringify(e)),
          ].map((s) => s.toLowerCase());
          const prefixes = hashes.map((x) => toBase64Url(prefixOf(x)));
          for (const surface of surfaces) {
            for (const marker of Object.values(MARKERS)) {
              expect(surface).not.toContain(marker);
            }
            expect(surface).not.toContain(API_KEY);
            for (const expression of expressions) {
              expect(surface).not.toContain(expression.toLowerCase());
            }
          }
          for (const surface of [...surfaces, raw]) {
            for (const x of hashes) {
              expect(surface).not.toContain(toBase64Url(x).toLowerCase());
              expect(surface).not.toContain(Buffer.from(x).toString("hex"));
            }
          }
          for (const surface of [JSON.stringify(json.verdict.reputation), ...h.logs.map((e) => JSON.stringify(e))]) {
            for (const p of prefixes) expect(surface).not.toContain(p);
          }

          // Log events have only the fixed keys.
          for (const e of h.logs) {
            expect(Object.keys(e).sort()).toEqual(
              ["durationMs", "event", "reputationMode", "semanticMode", "status"],
            );
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
