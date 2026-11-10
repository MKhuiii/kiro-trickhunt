export type LlmErrorCode = "network" | "http-status" | "bad-shape" | "timeout";

/**
 * Sole error type thrown by LLM client implementations.
 * The message is fixed per code and never carries keys, request text,
 * response bodies or a cause. `code` is the only own enumerable field.
 */
export class LlmClientError extends Error {
  readonly code: LlmErrorCode;

  constructor(code: LlmErrorCode) {
    super(`LLM request failed: ${code}`);
    Object.setPrototypeOf(this, new.target.prototype);
    // Defined on the instance as non-enumerable so JSON.stringify and
    // Object.keys only expose `code`.
    Object.defineProperty(this, "name", {
      value: "LlmClientError",
      enumerable: false,
      writable: true,
      configurable: true,
    });
    this.code = code;
  }
}
