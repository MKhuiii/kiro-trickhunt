import { describe, expect, it } from "vitest";
import { FakeLlmClient } from "../../analyzers/fake-llm-client";
import type { LlmClient } from "../../analyzers/llm-client";
import { createPipeline } from "../../pipeline";
import type { Pipeline, PipelineOptions } from "../../pipeline";
import { createAnalyzeHandler } from "./analyze-handler";
import type { AnalyzeHandlerDeps } from "./analyze-handler";
import { MAX_BODY_BYTES } from "./api-limits.config";
import type { LlmBudget } from "./llm-budget";
import type { AnalyzeLogEvent } from "./log-event";
import { createRateLimiter } from "./rate-limiter";

const SECRET = "SECRET-ZEBRA-TEXT-9731";

interface Harness {
  handler: (req: Request) => Promise<Response>;
  events: AnalyzeLogEvent[];
  pipelineOptions: PipelineOptions[];
  acquireCalls: { count: number };
}

function build(overrides: Partial<AnalyzeHandlerDeps> & {
  client?: LlmClient | null;
  budgetAllows?: boolean;
  limit?: number;
  /** When set, use a deterministic stub pipeline that calls `complete` this many times. */
  stubCalls?: number;
} = {}): Harness {
  const events: AnalyzeLogEvent[] = [];
  const pipelineOptions: PipelineOptions[] = [];
  const acquireCalls = { count: 0 };
  let clock = 1_000_000;
  const now = (): number => (clock += 5);
  const client = overrides.client === undefined ? FakeLlmClient.responding("") : overrides.client;
  const budget: LlmBudget = {
    tryAcquire: () => {
      acquireCalls.count += 1;
      return overrides.budgetAllows ?? true;
    },
  };
  const deps: AnalyzeHandlerDeps = {
    getLlmClient: () => client,
    createPipeline: (options: PipelineOptions): Pipeline => {
      pipelineOptions.push(options);
      const calls = overrides.stubCalls;
      if (calls === undefined) return createPipeline(options);
      // Stub: calls the client a fixed number of times, then returns the
      // rules-only verdict (same locale), independent of the rules level.
      return {
        run: async (input) => {
          for (let i = 0; i < calls; i += 1) {
            try {
              await options.llmClient?.complete({ system: "s", user: "u" });
            } catch {
              // A denial surfaces as an error; the pipeline degrades.
            }
          }
          return createPipeline({ ...options, llmClient: null }).run(input);
        },
      };
    },
    rateLimiter: createRateLimiter({ limit: overrides.limit ?? 100, now: () => 1_000_000 }),
    llmBudget: budget,
    now,
    logEvent: (e) => {
      events.push(e);
    },
    ...overrides,
  };
  return { handler: createAnalyzeHandler(deps), events, pipelineOptions, acquireCalls };
}

function post(
  body: BodyInit | null,
  headers: Record<string, string> = { "content-type": "application/json" },
): Request {
  return new Request("http://localhost/api/analyze", { method: "POST", headers, body });
}

function validRequest(text = `Your account is locked ${SECRET}`): Request {
  return post(JSON.stringify({ text }));
}

describe("analyze handler responses", () => {
  it("returns 200 with verdict and meta for valid text", async () => {
    const h = build({ stubCalls: 1 });
    const res = await h.handler(validRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { verdict?: unknown; meta?: { semanticMode: string } };
    expect(body.verdict).toBeDefined();
    expect(body.meta).toEqual({ semanticMode: "used" });
  });

  it("returns 415 for a wrong content type", async () => {
    const h = build();
    const res = await h.handler(post("hi", { "content-type": "text/plain" }));
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ error: { code: "invalid-content-type" } });
  });

  it("returns 413 for a declared oversized body", async () => {
    const h = build();
    const res = await h.handler(
      post(JSON.stringify({ text: "a" }), {
        "content-type": "application/json",
        "content-length": String(MAX_BODY_BYTES + 1),
      }),
    );
    expect(res.status).toBe(413);
  });

  it("returns 400 for invalid JSON", async () => {
    const h = build();
    const res = await h.handler(post(`{"text": "${SECRET}`));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: "invalid-input" } });
  });

  it("returns 400 for unknown keys", async () => {
    const h = build();
    const res = await h.handler(post(JSON.stringify({ text: SECRET, extra: 1 })));
    expect(res.status).toBe(400);
  });
});

describe("analyze handler rate limiting", () => {
  it("returns 429 with Retry-After on the (limit+1)th request", async () => {
    const h = build({ limit: 3 });
    for (let i = 0; i < 3; i += 1) {
      expect((await h.handler(validRequest())).status).toBe(200);
    }
    const res = await h.handler(validRequest());
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);
    expect(await res.json()).toEqual({ error: { code: "rate-limited" } });
  });

  it("does not read the body of a rate-limited request", async () => {
    const h = build({ limit: 1 });
    await h.handler(validRequest());
    const req = validRequest();
    const res = await h.handler(req);
    expect(res.status).toBe(429);
    expect(req.bodyUsed).toBe(false);
  });
});

describe("analyze handler semantic mode", () => {
  it("reports not-configured and never calls tryAcquire without a client", async () => {
    const h = build({ client: null });
    const res = await h.handler(validRequest());
    const body = (await res.json()) as { meta: { semanticMode: string } };
    expect(res.status).toBe(200);
    expect(body.meta.semanticMode).toBe("not-configured");
    expect(h.acquireCalls.count).toBe(0);
    expect(h.pipelineOptions[0]?.llmClient).toBeNull();
    expect(h.events[0]?.semanticMode).toBe("not-configured");
  });

  it("reports budget-exhausted and passes the Lazy_Client when denied", async () => {
    const client = FakeLlmClient.responding("");
    const h = build({ client, budgetAllows: false, stubCalls: 1 });
    const res = await h.handler(validRequest());
    const body = (await res.json()) as { meta: { semanticMode: string } };
    expect(res.status).toBe(200);
    expect(body.meta.semanticMode).toBe("budget-exhausted");
    const passed = h.pipelineOptions[0]?.llmClient;
    expect(passed).not.toBeNull();
    expect(passed).not.toBe(client);
    expect(client.callCount).toBe(0);
    expect(h.acquireCalls.count).toBe(1);
    expect(h.events[0]?.semanticMode).toBe("budget-exhausted");
  });

  it("reports used and passes the Lazy_Client when the budget is acquired", async () => {
    const client = FakeLlmClient.responding("");
    const h = build({ client, stubCalls: 1 });
    const res = await h.handler(validRequest());
    const body = (await res.json()) as { meta: { semanticMode: string } };
    expect(body.meta.semanticMode).toBe("used");
    expect(h.acquireCalls.count).toBe(1);
    expect(client.callCount).toBe(1);
    const passed = h.pipelineOptions[0]?.llmClient;
    expect(passed).not.toBeNull();
    expect(passed).not.toBe(client);
    expect(h.events[0]?.semanticMode).toBe("used");
  });

  it("acquires only when the stub calls complete (no call, no acquisition)", async () => {
    const h = build({ stubCalls: 0 });
    const res = await h.handler(validRequest());
    const body = (await res.json()) as { meta: { semanticMode: string } };
    expect(body.meta.semanticMode).toBe("skipped");
    expect(h.acquireCalls.count).toBe(0);
    expect(h.events[0]?.semanticMode).toBe("skipped");
  });

  it("reports skipped for critical text under when-not-critical, without tryAcquire", async () => {
    const client = FakeLlmClient.responding("");
    const h = build({ client });
    const res = await h.handler(
      post(
        JSON.stringify({
          text: "Urgent: your account has been locked. Enter your OTP now to unlock it.",
          urls: ["http://paypa1.com/verify"],
        }),
      ),
    );
    const body = (await res.json()) as {
      verdict: { level: string };
      meta: { semanticMode: string };
    };
    expect(body.verdict.level).toBe("critical");
    expect(body.meta.semanticMode).toBe("skipped");
    expect(h.acquireCalls.count).toBe(0);
    expect(client.callCount).toBe(0);
    expect(h.events[0]?.semanticMode).toBe("skipped");
  });

  it("reports skipped for blank text with urls, without tryAcquire", async () => {
    const client = FakeLlmClient.responding("");
    const h = build({ client });
    const res = await h.handler(
      post(JSON.stringify({ text: "  \n", urls: ["http://192.168.1.1/login"] })),
    );
    const body = (await res.json()) as { meta: { semanticMode: string } };
    expect(res.status).toBe(200);
    expect(body.meta.semanticMode).toBe("skipped");
    expect(h.acquireCalls.count).toBe(0);
    expect(client.callCount).toBe(0);
  });

  it("logs the true mode when the pipeline run rejects after a denial", async () => {
    const h = build({
      budgetAllows: false,
      createPipeline: (options: PipelineOptions) =>
        ({
          run: async () => {
            try {
              await options.llmClient?.complete({ system: "s", user: "u" });
            } catch {
              // denied
            }
            throw new Error(SECRET);
          },
        }) as unknown as Pipeline,
    });
    const res = await h.handler(validRequest());
    expect(res.status).toBe(500);
    expect(h.events[0]?.semanticMode).toBe("budget-exhausted");
  });
});

describe("analyze handler locale", () => {
  it("gives Vietnamese actions for locale vi and forwards locale", async () => {
    const h = build({ client: null });
    const res = await h.handler(
      post(JSON.stringify({ text: "Act now, this is urgent", locale: "vi" })),
    );
    const body = (await res.json()) as { verdict: { actions: string[] } };
    expect(res.status).toBe(200);
    expect(h.pipelineOptions[0]?.locale).toBe("vi");
    const expected = await createPipeline({ llmClient: null, locale: "vi" }).run({
      text: "Act now, this is urgent",
    });
    expect(body.verdict.actions).toEqual(expected.actions);
    const english = await createPipeline({ llmClient: null, locale: "en" }).run({
      text: "Act now, this is urgent",
    });
    expect(body.verdict.actions).not.toEqual(english.actions);
  });

  it("passes no locale key to createPipeline when locale is absent", async () => {
    const h = build();
    await h.handler(validRequest());
    expect(h.pipelineOptions[0]).toBeDefined();
    expect("locale" in (h.pipelineOptions[0] as object)).toBe(false);
  });

  it("rejects locale alone and invalid locale values with 400", async () => {
    const h = build();
    for (const body of [{ locale: "vi" }, { text: "hi", locale: "fr" }]) {
      const res = await h.handler(post(JSON.stringify(body)));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: { code: "invalid-input" } });
    }
  });
});

describe("analyze handler is total", () => {
  it("still returns the response when logEvent throws", async () => {
    const h = build({
      logEvent: () => {
        throw new Error(SECRET);
      },
    });
    const res = await h.handler(validRequest());
    expect(res.status).toBe(200);
  });

  it("still returns a response when now throws", async () => {
    const h = build({
      now: () => {
        throw new Error(SECRET);
      },
    });
    const res = await h.handler(validRequest());
    expect(res.status).toBe(200);
    expect(h.events[0]?.durationMs).toBe(0);
  });

  it("returns 500 when getLlmClient throws", async () => {
    const h = build({
      getLlmClient: () => {
        throw new Error(SECRET);
      },
    });
    const res = await h.handler(validRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal-error" } });
  });

  it("returns 500 when createPipeline throws", async () => {
    const h = build({
      createPipeline: () => {
        throw new Error(SECRET);
      },
    });
    const res = await h.handler(validRequest());
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain(SECRET);
  });

  it("returns 500 when the pipeline run rejects", async () => {
    const h = build({
      createPipeline: () => ({ run: () => Promise.reject(new Error(SECRET)) }) as unknown as Pipeline,
    });
    const res = await h.handler(validRequest());
    expect(res.status).toBe(500);
  });
});

describe("analyze handler privacy and logging", () => {
  it("never puts the input text in responses or log events", async () => {
    const h = build();
    const responses = [
      await h.handler(validRequest()),
      await h.handler(post(JSON.stringify({ text: SECRET, extra: 1 }))),
      await h.handler(post(`{"text": "${SECRET}`)),
    ];
    for (const res of responses) {
      const text = await res.text();
      if (res.status !== 200) expect(text).not.toContain(SECRET);
    }
    expect(JSON.stringify(h.events)).not.toContain(SECRET);
  });

  it("calls logEvent exactly once per request with the closed shape", async () => {
    const h = build();
    await h.handler(validRequest());
    expect(h.events).toHaveLength(1);
    const event = h.events[0]!;
    expect(Object.keys(event).sort()).toEqual(
      ["durationMs", "event", "semanticMode", "status"].sort(),
    );
    expect(event.event).toBe("analyze");
    expect(event.status).toBe(200);
    expect(Number.isInteger(event.durationMs)).toBe(true);
    expect(event.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("logs once with status and mode none for an error response", async () => {
    const h = build();
    await h.handler(post("x", { "content-type": "text/plain" }));
    expect(h.events).toEqual([
      { event: "analyze", status: 415, durationMs: expect.any(Number), semanticMode: "none" },
    ]);
  });
});
