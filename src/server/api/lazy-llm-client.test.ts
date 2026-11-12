import { describe, expect, it } from "vitest";
import { FakeLlmClient } from "../../analyzers/fake-llm-client";
import { LlmClientError } from "../llm";
import { createLazyLlmClient } from "./lazy-llm-client";
import type { LlmBudget } from "./llm-budget";

/** Counting fake budget: answers from a script (default allow). */
function countingBudget(answers: readonly (boolean | "throw")[] = []) {
  const state = { attempts: 0, granted: 0 };
  const budget: LlmBudget = {
    tryAcquire() {
      const a = answers[state.attempts] ?? true;
      state.attempts += 1;
      if (a === "throw") throw new Error("budget secret detail");
      if (a) state.granted += 1;
      return a;
    },
  };
  return { budget, state };
}

const request = { system: "sys", user: "usr" };

describe("createLazyLlmClient", () => {
  it("does not call tryAcquire at construction (REQ-API-49)", () => {
    const { budget, state } = countingBudget();
    const lazy = createLazyLlmClient(FakeLlmClient.responding("x"), budget);
    expect(state.attempts).toBe(0);
    expect(lazy.outcome()).toBe("skipped");
  });

  it("allowed call reaches the real client with the same request (REQ-API-50)", async () => {
    const { budget, state } = countingBudget([true]);
    const real = FakeLlmClient.responding("answer");
    const lazy = createLazyLlmClient(real, budget);

    await expect(lazy.client.complete(request)).resolves.toBe("answer");

    expect(state.attempts).toBe(1);
    expect(real.callCount).toBe(1);
    expect(real.requests[0]).toBe(request);
    expect(lazy.outcome()).toBe("used");
  });

  it("passes through a real client rejection and still reports used", async () => {
    const err = new LlmClientError("timeout");
    const { budget } = countingBudget([true]);
    const lazy = createLazyLlmClient(FakeLlmClient.rejecting(err), budget);

    await expect(lazy.client.complete(request)).rejects.toBe(err);
    expect(lazy.outcome()).toBe("used");
  });

  it("denial does not reach the real client and throws fixed network error (REQ-API-51)", () => {
    const { budget, state } = countingBudget([false]);
    const real = FakeLlmClient.responding("never");
    const lazy = createLazyLlmClient(real, budget);

    let thrown: unknown;
    try {
      void lazy.client.complete(request);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(LlmClientError);
    expect((thrown as LlmClientError).code).toBe("network");
    expect((thrown as LlmClientError).message).toBe("LLM request failed: network");
    expect(state.attempts).toBe(1);
    expect(real.callCount).toBe(0);
    expect(lazy.outcome()).toBe("budget-exhausted");
  });

  it("a throwing tryAcquire counts as denial with no budget message", () => {
    const { budget } = countingBudget(["throw"]);
    const real = FakeLlmClient.responding("never");
    const lazy = createLazyLlmClient(real, budget);

    let thrown: unknown;
    try {
      void lazy.client.complete(request);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(LlmClientError);
    expect((thrown as LlmClientError).code).toBe("network");
    expect((thrown as Error).message).not.toContain("secret");
    expect(real.callCount).toBe(0);
    expect(lazy.outcome()).toBe("budget-exhausted");
  });

  it("calls tryAcquire once per complete() invocation", async () => {
    const { budget, state } = countingBudget([true, true]);
    const real = FakeLlmClient.responding("ok");
    const lazy = createLazyLlmClient(real, budget);

    await lazy.client.complete(request);
    await lazy.client.complete(request);

    expect(state.attempts).toBe(2);
    expect(state.granted).toBe(2);
    expect(real.callCount).toBe(2);
  });

  it("outcome is budget-exhausted when any call was denied, even after a used call", async () => {
    const { budget } = countingBudget([true, false]);
    const lazy = createLazyLlmClient(FakeLlmClient.responding("ok"), budget);

    await lazy.client.complete(request);
    expect(lazy.outcome()).toBe("used");
    expect(() => lazy.client.complete(request)).toThrow(LlmClientError);
    expect(lazy.outcome()).toBe("budget-exhausted");
  });
});
