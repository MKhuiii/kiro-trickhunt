/**
 * analyze-handler.property.test.ts — Property-based tests for createAnalyzeHandler
 *
 * Feature: analyze-api, Property 1: Handler total (PBT-38)
 * Feature: analyze-api, Property 2: Fixed error bodies, no leaks (PBT-39)
 * Feature: analyze-api, Property 6: Pipeline failure maps to 500 (PBT-43)
 * Feature: analyze-api, Property 7: Budget denial degrades, not fails (PBT-44)
 * Feature: analyze-api, Property 8: Valid inputs pass validation (PBT-45)
 * **Validates: Requirements REQ-API-01, REQ-API-05, REQ-API-11, REQ-API-12,
 * REQ-API-16, REQ-API-19, REQ-API-29**
 *
 * No network: FakeLlmClient, fake clock, standard Request/Response.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { FakeLlmClient } from "../../analyzers/fake-llm-client";
import { createPipeline } from "../../pipeline";
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

describe("Feature: analyze-api, Property 7 — Budget denial degrades, not fails (PBT-44)", () => {
  it("denied budget gives 200 with the rules-only verdict and no client call", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
        fc.array(fc.string({ maxLength: 60 }), { maxLength: 3 }),
        async (text, urls) => {
          const h = makeHarness({ budget: () => false });
          const res = await h.handler(jsonPost({ text, urls }));
          expect(res.status).toBe(200);
          const body = (await res.json()) as {
            verdict: unknown;
            meta: { semanticMode: string };
          };
          expect(body.meta).toEqual({ semanticMode: "budget-exhausted" });
          expect(h.client.callCount).toBe(0);

          const expected = await createPipeline({ llmClient: null }).run({ text, urls });
          expect(body.verdict).toEqual(JSON.parse(JSON.stringify(expected)));
          expect(h.events[0]?.semanticMode).toBe("budget-exhausted");
        },
      ),
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
