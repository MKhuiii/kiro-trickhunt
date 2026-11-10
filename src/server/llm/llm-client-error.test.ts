import { describe, expect, it } from "vitest";
import { LlmClientError, type LlmErrorCode } from "./llm-client-error";

const codes: LlmErrorCode[] = ["network", "http-status", "bad-shape", "timeout"];

describe("LlmClientError", () => {
  it.each(codes)("has a fixed message and code for %s", (code) => {
    const err = new LlmClientError(code);
    expect(err.code).toBe(code);
    expect(err.message).toBe(`LLM request failed: ${code}`);
    expect(String(err)).toBe(`LlmClientError: LLM request failed: ${code}`);
  });

  it("is an instanceof Error and LlmClientError", () => {
    const err = new LlmClientError("network");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(LlmClientError);
  });

  it("has no cause and only `code` as own enumerable field", () => {
    const err = new LlmClientError("timeout");
    expect("cause" in err).toBe(false);
    expect(Object.keys(err)).toEqual(["code"]);
    expect(JSON.stringify(err)).toBe('{"code":"timeout"}');
  });
});
