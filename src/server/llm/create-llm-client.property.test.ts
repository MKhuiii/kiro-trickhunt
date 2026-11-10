import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import { createLlmClient } from "./create-llm-client";

type Env = Record<string, string | undefined>;

const blank = fc.constantFrom("", " ", "   ", "\t", "\n", " \t\n ", "\r\n");

const otherEntries = fc.dictionary(
  fc.string({ maxLength: 20 }).filter((k) => k !== "LLM_API_KEY"),
  fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
);

function fakeFetch() {
  const spy = vi.fn(async () => new Response("{}", { status: 200 }));
  return { spy, impl: spy as unknown as typeof fetch };
}

describe("createLlmClient properties", () => {
  /**
   * PBT-27: null whenever LLM_API_KEY is absent or blank; fetchImpl never called.
   * **Validates: Requirements 7**
   */
  it("returns null when LLM_API_KEY is absent", () => {
    fc.assert(
      fc.property(otherEntries, (others) => {
        const env: Env = { ...others };
        delete env.LLM_API_KEY;
        const { spy, impl } = fakeFetch();
        expect(createLlmClient(env, impl)).toBeNull();
        expect(spy).not.toHaveBeenCalled();
      }),
    );
  });

  it("returns null when LLM_API_KEY is undefined or blank", () => {
    fc.assert(
      fc.property(
        otherEntries,
        fc.oneof(blank, fc.constant(undefined)),
        (others, key) => {
          const env: Env = { ...others, LLM_API_KEY: key };
          const { spy, impl } = fakeFetch();
          expect(createLlmClient(env, impl)).toBeNull();
          expect(spy).not.toHaveBeenCalled();
        },
      ),
    );
  });
});
