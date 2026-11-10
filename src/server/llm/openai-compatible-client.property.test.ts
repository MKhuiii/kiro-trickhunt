import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createOpenAiCompatibleClient } from "./openai-compatible-client";
import { LlmClientError, type LlmErrorCode } from "./llm-client-error";
import type { LlmConfig } from "./llm-config";

const TIMEOUT_MS = 20;
const SETTLE_BOUND_MS = TIMEOUT_MS + 1000;
const CODES: readonly LlmErrorCode[] = [
  "network",
  "http-status",
  "bad-shape",
  "timeout",
];

function makeConfig(apiKey: string): LlmConfig {
  return {
    apiKey,
    model: "fake-model",
    baseUrl: "https://llm.example.test/v1",
    maxOutputTokens: 100,
    timeoutMs: TIMEOUT_MS,
  };
}

type Outcome =
  | { kind: "reject"; message: string }
  | { kind: "response"; status: number; body: string }
  | { kind: "hang" };

const outcomeArb: fc.Arbitrary<Outcome> = fc.oneof(
  fc.string().map((message): Outcome => ({ kind: "reject", message })),
  fc
    .tuple(
      fc.oneof(
        fc.constant(200),
        fc.integer({ min: 200, max: 599 }),
      ),
      fc.oneof(
        fc.string(),
        fc.anything().map((v) => JSON.stringify(v) ?? "null"),
        fc.string().map((s) => JSON.stringify({ choices: [{ message: { content: s } }] })),
      ),
    )
    .map(([status, body]): Outcome => ({ kind: "response", status, body })),
  fc.constant<Outcome>({ kind: "hang" }),
);

function fetchFor(outcome: Outcome): typeof fetch {
  return ((): Promise<Response> => {
    switch (outcome.kind) {
      case "reject":
        return Promise.reject(new Error(outcome.message));
      case "hang":
        return new Promise<Response>(() => undefined);
      case "response":
        return Promise.resolve(
          new Response(outcome.body, { status: outcome.status }),
        );
    }
  }) as unknown as typeof fetch;
}

async function settle(
  p: Promise<string>,
): Promise<{ ok: true; value: string } | { ok: false; error: unknown }> {
  try {
    return { ok: true, value: await p };
  } catch (error) {
    return { ok: false, error };
  }
}

describe("openai-compatible-client properties", () => {
  // Feature: llm-provider-adapter, PBT-23
  // **Validates: Requirements 7**
  it("PBT-23: settles near timeoutMs with a non-empty string or a coded LlmClientError", async () => {
    await fc.assert(
      fc.asyncProperty(outcomeArb, async (outcome) => {
        const client = createOpenAiCompatibleClient(
          makeConfig("fake-key-12345678"),
          fetchFor(outcome),
        );
        const start = Date.now();
        const result = await settle(
          client.complete({ system: "sys", user: "usr" }),
        );
        expect(Date.now() - start).toBeLessThan(SETTLE_BOUND_MS);
        if (result.ok) {
          expect(typeof result.value).toBe("string");
          expect(result.value.length).toBeGreaterThan(0);
        } else {
          expect(result.error).toBeInstanceOf(LlmClientError);
          expect(CODES).toContain((result.error as LlmClientError).code);
        }
      }),
      { numRuns: 60 },
    );
  });

  // Feature: llm-provider-adapter, PBT-24
  // **Validates: Requirements 7**
  it("PBT-24: error message, JSON and String never contain key, request text or response body", async () => {
    const fixed = CODES.flatMap((c) => [
      `LLM request failed: ${c}`,
      `LlmClientError: LLM request failed: ${c}`,
      `Error: LLM request failed: ${c}`,
      JSON.stringify({ code: c }),
      c,
      "LlmClientError",
    ]).join("\n");

    const secretArb = fc.string({ minLength: 8, maxLength: 40 });

    await fc.assert(
      fc.asyncProperty(
        secretArb,
        secretArb,
        fc.constantFrom<"reject" | "status" | "badjson" | "badshape" | "hang">(
          "reject",
          "status",
          "badjson",
          "badshape",
          "hang",
        ),
        async (key, text, mode) => {
          fc.pre(!fixed.includes(key) && !fixed.includes(text));
          fc.pre(!key.includes(text) && !text.includes(key));

          const embedded = `${key}|${text}`;
          const bodyByMode: Record<string, string> = {
            reject: embedded,
            status: JSON.stringify({ error: embedded }),
            badjson: `not json ${embedded}`,
            badshape: JSON.stringify({ choices: [{ message: { content: 5 } }], leak: embedded }),
            hang: embedded,
          };
          const body = bodyByMode[mode];
          fc.pre(!fixed.includes(body));

          const f = ((): Promise<Response> => {
            if (mode === "reject") return Promise.reject(new Error(embedded));
            if (mode === "hang") return new Promise<Response>(() => undefined);
            return Promise.resolve(
              new Response(body, { status: mode === "status" ? 500 : 200 }),
            );
          }) as unknown as typeof fetch;

          const client = createOpenAiCompatibleClient(makeConfig(key), f);
          const result = await settle(client.complete({ system: "sys", user: text }));
          expect(result.ok).toBe(false);
          if (result.ok) return;

          const err = result.error;
          const surfaces = [
            (err as Error).message,
            JSON.stringify(err),
            String(err),
          ];
          for (const s of surfaces) {
            expect(s).not.toContain(key);
            expect(s).not.toContain(text);
            expect(s).not.toContain(body);
          }
        },
      ),
      { numRuns: 60 },
    );
  });

  // Feature: llm-provider-adapter, PBT-25
  // **Validates: Requirements 7**
  it("PBT-25: key appears only as the Authorization header value", async () => {
    const keyArb = fc.string({ minLength: 8, maxLength: 40 });
    await fc.assert(
      fc.asyncProperty(keyArb, fc.string(), fc.string(), async (key, system, user) => {
        let captured: { url: string; init: RequestInit } | undefined;
        const f = ((url: string, init: RequestInit): Promise<Response> => {
          captured = { url, init };
          return Promise.resolve(
            new Response(
              JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
              { status: 200 },
            ),
          );
        }) as unknown as typeof fetch;

        const config = makeConfig(key);
        const client = createOpenAiCompatibleClient(config, f);
        await client.complete({ system, user });

        expect(captured).toBeDefined();
        const { url, init } = captured!;
        const body = String(init.body);

        // Skip generated keys that trivially collide with non-secret content.
        const baseline = JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0,
          max_tokens: config.maxOutputTokens,
          stream: false,
        });
        fc.pre(!url.includes(key) && !baseline.includes(key));
        fc.pre(!"Content-Type application/json Authorization Bearer ".includes(key));

        expect(url).not.toContain(key);
        expect(body).not.toContain(key);

        const headers = init.headers as Record<string, string>;
        for (const [name, value] of Object.entries(headers)) {
          if (name === "Authorization") {
            expect(value).toBe(`Bearer ${key}`);
          } else {
            expect(name).not.toContain(key);
            expect(value).not.toContain(key);
          }
        }
      }),
      { numRuns: 60 },
    );
  });
});
