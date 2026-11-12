/**
 * analyze-handler.property.test.ts — Property-based tests for createAnalyzeHandler
 *
 * Feature: analyze-api, Property 1: Handler total (PBT-38)
 * Feature: analyze-api, Property 2: Fixed error bodies, no leaks (PBT-39)
 * Feature: analyze-api, Property 6: Pipeline failure maps to 500 (PBT-43)
 * Feature: analyze-api-locale-budget: PBT-59, PBT-60, PBT-61, PBT-63 (PBT-44 replaced by PBT-63)
 * Feature: analyze-api, Property 8: Valid inputs pass validation (PBT-45)
 * **Validates: Requirements REQ-API-01, REQ-API-05, REQ-API-11, REQ-API-12,
 * REQ-API-16, REQ-API-19, REQ-API-43 to REQ-API-47, REQ-API-52, REQ-API-54, REQ-API-55**
 *
 * No network: FakeLlmClient, fake clock, standard Request/Response.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { FakeLlmClient } from "../../analyzers/fake-llm-client";
import { createPipeline } from "../../pipeline";
import {
  ACTIONS_BY_MONSTER,
  ACTIONS_BY_SIGNAL,
  ACTIONS_FALLBACK,
  LIMITATIONS_DEGRADED,
  LIMITATIONS_FIXED,
  LIMITATIONS_NO_SIGNALS,
  LIMITATIONS_UNAVAILABLE,
} from "../../pipeline/messages.config";
import type { Locale } from "../../pipeline/verdict";
import type { Pipeline, PipelineOptions } from "../../pipeline";
import { createAnalyzeHandler } from "./analyze-handler";
import type { AnalyzeHandlerDeps } from "./analyze-handler";
import type { AnalyzeLogEvent } from "./log-event";
import { MAX_TEXT_CHARS, MAX_URL_CHARS, MAX_URLS_IN } from "./api-limits.config";

const NUM_RUNS = 100;
const ALLOWED_STATUSES = new Set([200, 400, 413, 415, 429, 500]);
const ERROR_CODES_BY_STATUS: Readonly<Record<number, string>> = {
  400: "invalid-input",
  413: "payload-too-large",
  415: "invalid-content-type",
  429: "rate-limited",
  500: "internal-error",
};

interface Harness {
  readonly handler: (req: Request) => Promise<Response>;
  readonly events: AnalyzeLogEvent[];
  readonly client: FakeLlmClient;
}

interface HarnessOptions {
  readonly allow?: () => boolean;
  readonly budget?: () => boolean;
  readonly withClient?: boolean;
  readonly createPipeline?: (options: PipelineOptions) => Pipeline;
  readonly logEvent?: (event: AnalyzeLogEvent) => void;
}

function makeHarness(opts: HarnessOptions = {}): Harness {
  const events: AnalyzeLogEvent[] = [];
  const client = FakeLlmClient.responding("{}");
  let clock = 1_000_000;
  const deps: AnalyzeHandlerDeps = {
    getLlmClient: () => (opts.withClient === false ? null : client),
    createPipeline: opts.createPipeline ?? createPipeline,
    rateLimiter: {
      check: () => {
        const allowed = opts.allow ? opts.allow() : true;
        return { allowed, retryAfterSec: 7 };
      },
    },
    llmBudget: { tryAcquire: opts.budget ?? (() => true) },
    now: () => (clock += 3),
    logEvent: opts.logEvent ?? ((event) => void events.push(event)),
  };
  return { handler: createAnalyzeHandler(deps), events, client };
}

function post(body: BodyInit | null, headers: Record<string, string>): Request {
  return new Request("http://localhost/api/analyze", { method: "POST", headers, body });
}

function jsonPost(payload: unknown, extra: Record<string, string> = {}): Request {
  return post(JSON.stringify(payload), { "content-type": "application/json", ...extra });
}

function expectFixedHeaders(res: Response): void {
  expect(res.headers.get("content-type")).toBe("application/json");
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  expect(res.headers.get("access-control-allow-origin")).toBeNull();
}

// ---------- arbitraries ----------

const contentTypeArb = fc.oneof(
  fc.constant("application/json"),
  fc.constant("application/json; charset=utf-8"),
  fc.constant("text/plain"),
  fc.constant("multipart/form-data; boundary=x"),
  fc.constant(""),
  fc.string({ maxLength: 30 }).map((s) => s.replace(/[^\x20-\x7e]/g, "")),
);

const headerValueArb = fc
  .string({ maxLength: 100 })
  .map((s) => s.replace(/[^\x20-\x7e]/g, ""))
  .map((s) => s.trim());

const rawBodyArb: fc.Arbitrary<BodyInit | null> = fc.oneof(
  fc.constant(null),
  fc.string({ maxLength: 300 }),
  fc.uint8Array({ maxLength: 300 }),
  fc.json().map((s) => s),
  fc.jsonValue().map((v) => JSON.stringify(v)),
  fc.record({ text: fc.string({ maxLength: 50 }), extra: fc.string({ maxLength: 5 }) }).map((v) => JSON.stringify(v)),
  fc.record({ text: fc.string({ minLength: MAX_TEXT_CHARS + 1, maxLength: MAX_TEXT_CHARS + 50 }) }).map((v) => JSON.stringify(v)),
  fc.constant(" ".repeat(200_000)),
);

const nonBlankTextArb = fc
  .string({ unit: "binary", minLength: 1, maxLength: MAX_TEXT_CHARS })
  .filter((s) => s.trim().length > 0);

const urlArb = fc.string({ unit: "binary", maxLength: MAX_URL_CHARS });

const validBodyArb = fc.oneof(
  fc.record({ text: nonBlankTextArb }),
  fc.record({ urls: fc.array(urlArb, { minLength: 1, maxLength: MAX_URLS_IN }) }),
  fc.record({
    text: nonBlankTextArb,
    urls: fc.array(urlArb, { maxLength: MAX_URLS_IN }),
  }),
  fc.record({
    text: fc.constant("a".repeat(MAX_TEXT_CHARS)),
    urls: fc.constant(Array.from({ length: MAX_URLS_IN }, () => "a".repeat(MAX_URL_CHARS))),
  }),
  fc.record({
    text: fc.constant("\u0001".repeat(MAX_TEXT_CHARS)),
    urls: fc.constant(Array.from({ length: MAX_URLS_IN }, () => "\u0001".repeat(MAX_URL_CHARS))),
  }),
);

describe("Feature: analyze-api, Property 1 — Handler total (PBT-38)", () => {
  it("always resolves to a Response with an allowed status and fixed headers", async () => {
    await fc.assert(
      fc.asyncProperty(
        rawBodyArb,
        contentTypeArb,
        headerValueArb,
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        async (body, contentType, forwarded, allow, budget, withClient) => {
          const h = makeHarness({ allow: () => allow, budget: () => budget, withClient });
          const headers: Record<string, string> = {};
          if (contentType !== "") headers["content-type"] = contentType;
          if (forwarded !== "") headers["x-forwarded-for"] = forwarded;
          const res = await h.handler(post(body, headers));
          expect(ALLOWED_STATUSES.has(res.status)).toBe(true);
          expectFixedHeaders(res);
          expect(h.events).toHaveLength(1);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("Feature: analyze-api, Property 2 — Fixed error bodies, no leaks (PBT-39)", () => {
  const secretArb = fc.string({ unit: fc.constantFrom(..."0123456789abcdef"), minLength: 12, maxLength: 24 }).map((s) => `SECRET${s}`);
  const scenarioArb = fc.constantFrom(
    "rate-limited",
    "bad-content-type",
    "bad-json",
    "unknown-key",
    "too-long",
    "pipeline-throws",
    "pipeline-rejects",
    "client-throws",
  );

  it("error bodies are exactly { error: { code } } and nothing leaks into responses or logs", async () => {
    await fc.assert(
      fc.asyncProperty(secretArb, scenarioArb, async (secret, scenario) => {
        const failing = (): never => {
          throw new Error(secret);
        };
        const rejectingPipeline: Pipeline = { run: () => Promise.reject(new Error(secret)) };
        const h = makeHarness({
          allow: () => scenario !== "rate-limited",
          createPipeline:
            scenario === "pipeline-throws"
              ? failing
              : scenario === "pipeline-rejects"
                ? () => rejectingPipeline
                : createPipeline,
        });

        let req: Request;
        switch (scenario) {
          case "bad-content-type":
            req = post(JSON.stringify({ text: secret }), { "content-type": "text/plain" });
            break;
          case "bad-json":
            req = post(`{"text": "${secret}`, { "content-type": "application/json" });
            break;
          case "unknown-key":
            req = jsonPost({ text: secret, [secret]: secret });
            break;
          case "too-long":
            req = jsonPost({ text: secret + "x".repeat(MAX_TEXT_CHARS) });
            break;
          default:
            req = jsonPost({ text: secret }, { "x-forwarded-for": `${secret}, 1.2.3.4` });
        }

        let handler = h.handler;
        if (scenario === "client-throws") {
          const events: AnalyzeLogEvent[] = [];
          handler = createAnalyzeHandler({
            getLlmClient: failing,
            createPipeline,
            rateLimiter: { check: () => ({ allowed: true, retryAfterSec: 1 }) },
            llmBudget: { tryAcquire: () => true },
            now: () => 0,
            logEvent: (event) => void events.push(event),
          });
          const res = await handler(req);
          expect(JSON.stringify(events)).not.toContain(secret);
          await assertErrorResponse(res, secret);
          return;
        }

        const res = await handler(req);
        await assertErrorResponse(res, secret);
        expect(JSON.stringify(h.events)).not.toContain(secret);
        expect(h.events).toHaveLength(1);
        expect(h.events[0]).toEqual({
          event: "analyze",
          status: res.status,
          durationMs: expect.any(Number),
          semanticMode: expect.any(String),
        });
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

async function assertErrorResponse(res: Response, secret: string): Promise<void> {
  expect(res.status).not.toBe(200);
  const text = await res.text();
  expect(text).not.toContain(secret);
  expect(JSON.parse(text)).toEqual({ error: { code: ERROR_CODES_BY_STATUS[res.status] } });
  for (const [name, value] of res.headers) {
    expect(name).not.toContain(secret.toLowerCase());
    expect(value).not.toContain(secret);
  }
  expectFixedHeaders(res);
}

describe("Feature: analyze-api, Property 6 — Pipeline failure maps to 500 (PBT-43)", () => {
  it("any throw or rejection from the pipeline gives 500 internal-error", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.anything(),
        fc.constantFrom("create-throws", "run-throws", "run-rejects"),
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        async (thrown, mode, text) => {
          const pipelineFactory = (): Pipeline => {
            if (mode === "create-throws") throw thrown;
            return {
              run: () => {
                if (mode === "run-throws") throw thrown;
                return Promise.reject(thrown);
              },
            };
          };
          const h = makeHarness({ createPipeline: pipelineFactory });
          const res = await h.handler(jsonPost({ text }));
          expect(res.status).toBe(500);
          expect(await res.text()).toBe('{"error":{"code":"internal-error"}}');
          expectFixedHeaders(res);
          expect(h.events).toHaveLength(1);
          expect(h.events[0]?.status).toBe(500);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

const BENIGN_WORDS = [
  "hello", "friend", "dinner", "tomorrow", "garden", "weather", "meeting",
  "thanks", "family", "holiday", "picture", "coffee", "weekend", "library",
] as const;

const benignTextArb = fc
  .array(fc.constantFrom(...BENIGN_WORDS), { minLength: 3, maxLength: 12 })
  .map((words) => words.join(" "));

interface CountingBudget {
  readonly attempts: () => number;
  readonly acquired: () => number;
  readonly tryAcquire: () => boolean;
}

function countingBudget(decide: () => boolean): CountingBudget {
  let attempts = 0;
  let acquired = 0;
  return {
    attempts: () => attempts,
    acquired: () => acquired,
    tryAcquire: () => {
      attempts += 1;
      const ok = decide();
      if (ok) acquired += 1;
      return ok;
    },
  };
}

describe("Feature: analyze-api-locale-budget, Property 59 � Locale acceptance and fixed error bodies (PBT-59)", () => {
  /**
   * **Validates: Requirements REQ-API-43, REQ-API-44, REQ-API-45**
   */
  it("only vi and en are accepted as locale; errors are exactly { error: { code } }", async () => {
    const localeArb = fc.oneof(
      fc.anything(),
      fc.string(),
      fc.constantFrom("vi", "en", "VI", "en ", "", "fr"),
    );
    await fc.assert(
      fc.asyncProperty(localeArb, fc.boolean(), async (locale, withText) => {
        const h = makeHarness();
        const payload = withText ? { text: "hello friend", locale } : { locale };
        const wire = JSON.stringify(payload);
        const sent = (JSON.parse(wire) as { locale?: unknown }).locale;
        const localeOk = sent === undefined || sent === "vi" || sent === "en";

        const res = await h.handler(post(wire, { "content-type": "application/json" }));
        expect(ALLOWED_STATUSES.has(res.status)).toBe(true);
        expectFixedHeaders(res);
        const errorBody: unknown = res.status !== 200 ? JSON.parse(await res.text()) : null;
        if (res.status !== 200) {
          expect(errorBody).toEqual({ error: { code: ERROR_CODES_BY_STATUS[res.status] } });
        }
        if (!withText) {
          // A locale alone (or nothing) is never a request.
          expect(res.status).toBe(400);
          expect(h.events).toHaveLength(1);
          return;
        }
        if (localeOk) {
          expect(res.status).toBe(200);
        } else {
          expect(res.status).toBe(400);
          expect(errorBody).toEqual({ error: { code: "invalid-input" } });
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("Feature: analyze-api-locale-budget, Property 60 � Locale texts (PBT-60)", () => {
  /**
   * **Validates: Requirements REQ-API-46, REQ-API-47**
   */
  function localeTexts(locale: Locale): Set<string> {
    const out = new Set<string>();
    for (const list of Object.values(ACTIONS_BY_MONSTER[locale])) for (const s of list) out.add(s);
    for (const list of Object.values(ACTIONS_BY_SIGNAL[locale])) for (const s of list) out.add(s);
    for (const s of ACTIONS_FALLBACK[locale]) out.add(s);
    for (const s of LIMITATIONS_FIXED[locale]) out.add(s);
    for (const s of LIMITATIONS_DEGRADED[locale]) out.add(s);
    for (const s of LIMITATIONS_UNAVAILABLE[locale]) out.add(s);
    for (const s of LIMITATIONS_NO_SIGNALS[locale]) out.add(s);
    return out;
  }

  it("actions and limitations equal the pipeline output for that locale and belong to its texts", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<Locale>("vi", "en"),
        fc.string({ minLength: 1, maxLength: 300 }).filter((s) => s.trim().length > 0),
        fc.array(fc.string({ maxLength: 60 }), { maxLength: 3 }),
        async (locale, text, urls) => {
          const h = makeHarness({ withClient: false });
          const res = await h.handler(jsonPost({ text, urls, locale }));
          expect(res.status).toBe(200);
          const body = (await res.json()) as {
            verdict: { actions: string[]; limitations: string[] };
          };
          const expected = await createPipeline({ llmClient: null, locale }).run({ text, urls });
          expect(body.verdict.actions).toEqual(expected.actions);
          expect(body.verdict.limitations).toEqual(expected.limitations);
          const allowed = localeTexts(locale);
          for (const s of [...body.verdict.actions, ...body.verdict.limitations]) {
            expect(allowed.has(s)).toBe(true);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("Feature: analyze-api-locale-budget, Property 61 � Blank text never acquires (PBT-61)", () => {
  /**
   * **Validates: Requirements REQ-API-52, REQ-API-54**
   */
  it("blank or absent text with urls never calls tryAcquire and reports skipped", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<string | undefined>(undefined, "", "  \n"),
        fc.array(urlArb, { minLength: 1, maxLength: MAX_URLS_IN }),
        async (text, urls) => {
          const budget = countingBudget(() => true);
          const h = makeHarness({ budget: budget.tryAcquire });
          const payload = text === undefined ? { urls } : { text, urls };
          const res = await h.handler(jsonPost(payload));
          expect(res.status).toBe(200);
          const body = (await res.json()) as { meta: { semanticMode: string } };
          expect(body.meta).toEqual({ semanticMode: "skipped" });
          expect(budget.attempts()).toBe(0);
          expect(h.client.callCount).toBe(0);
          expect(h.events[0]?.semanticMode).toBe("skipped");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("Feature: analyze-api-locale-budget, Property 63 � Denying budget degrades (PBT-63)", () => {
  /**
   * **Validates: Requirements REQ-API-52, REQ-API-54, REQ-API-55**
   */
  it("denied budget gives 200 with the rules-only verdict, budget-exhausted, and no real call", async () => {
    await fc.assert(
      fc.asyncProperty(benignTextArb, async (text) => {
        const expected = await createPipeline({ llmClient: null }).run({ text });
        fc.pre(expected.level !== "critical");

        const budget = countingBudget(() => false);
        const h = makeHarness({ budget: budget.tryAcquire });
        const res = await h.handler(jsonPost({ text }));
        expect(res.status).toBe(200);
        const body = (await res.json()) as {
          verdict: Record<string, unknown>;
          meta: { semanticMode: string };
        };
        expect(body.meta).toEqual({ semanticMode: "budget-exhausted" });
        expect(h.client.callCount).toBe(0);
        expect(budget.acquired()).toBe(0);

        const plain = JSON.parse(JSON.stringify(expected)) as Record<string, unknown>;
        for (const key of ["riskScore", "level", "monster", "signals"]) {
          expect(body.verdict[key]).toEqual(plain[key]);
        }
        expect(h.events[0]?.semanticMode).toBe("budget-exhausted");
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
describe("Feature: analyze-api, Property 8 — Valid inputs pass validation (PBT-45)", () => {
  it("bodies within all limits are never answered with 400, 413 or 415", async () => {
    await fc.assert(
      fc.asyncProperty(validBodyArb, async (payload) => {
        const h = makeHarness();
        const res = await h.handler(jsonPost(payload));
        expect([400, 413, 415]).not.toContain(res.status);
        expect(res.status).toBe(200);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
