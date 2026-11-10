import type { LlmClient, LlmRequest } from "./llm-client";

/** How the fake behaves when `complete` is called. */
export type FakeLlmBehavior =
  | { readonly kind: "respond"; readonly text: string }
  | { readonly kind: "throw"; readonly error?: unknown }
  | { readonly kind: "reject"; readonly error?: unknown }
  | { readonly kind: "never" };

/**
 * Scriptable LlmClient for tests. Never touches the network.
 *
 * - `respond`: resolves with a fixed string
 * - `throw`:   throws synchronously from `complete`
 * - `reject`:  returns a rejected promise
 * - `never`:   returns a promise that never settles
 */
export class FakeLlmClient implements LlmClient {
  private readonly received: LlmRequest[] = [];
  private behavior: FakeLlmBehavior;

  constructor(behavior: FakeLlmBehavior = { kind: "respond", text: "" }) {
    this.behavior = behavior;
  }

  static responding(text: string): FakeLlmClient {
    return new FakeLlmClient({ kind: "respond", text });
  }

  static throwing(error?: unknown): FakeLlmClient {
    return new FakeLlmClient({ kind: "throw", error });
  }

  static rejecting(error?: unknown): FakeLlmClient {
    return new FakeLlmClient({ kind: "reject", error });
  }

  static neverResolving(): FakeLlmClient {
    return new FakeLlmClient({ kind: "never" });
  }

  /** Replace the scripted behavior for subsequent calls. */
  script(behavior: FakeLlmBehavior): void {
    this.behavior = behavior;
  }

  /** Requests received so far, in call order. */
  get requests(): readonly LlmRequest[] {
    return this.received;
  }

  get callCount(): number {
    return this.received.length;
  }

  complete(request: LlmRequest): Promise<string> {
    this.received.push(request);
    const b = this.behavior;
    switch (b.kind) {
      case "respond":
        return Promise.resolve(b.text);
      case "throw":
        throw b.error ?? new Error("FakeLlmClient: scripted throw");
      case "reject":
        return Promise.reject(b.error ?? new Error("FakeLlmClient: scripted reject"));
      case "never":
        return new Promise<string>(() => {});
    }
  }
}
