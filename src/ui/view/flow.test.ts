import { describe, expect, it } from "vitest";
import { canConfirm, flowReducer, shouldSubmitOnEnter } from "./flow";
import type { FlowEvent, FlowState, FlowStep } from "./flow";

const SLOTS_DEFAULT = { text: true, image: false };

function at(step: FlowStep, slots = SLOTS_DEFAULT): FlowState {
  return { step, slots };
}

describe("flowReducer table rows", () => {
  it("home + open-bag -> bag with text on, image off", () => {
    expect(flowReducer(at("home", { text: false, image: true }), { kind: "open-bag" })).toEqual(
      at("bag", { text: true, image: false }),
    );
  });

  it("bag + close-bag -> home", () => {
    expect(flowReducer(at("bag"), { kind: "close-bag" }).step).toBe("home");
  });

  it("bag + toggle flips only that slot", () => {
    expect(flowReducer(at("bag"), { kind: "toggle", slot: "text" }).slots).toEqual({
      text: false,
      image: false,
    });
    expect(flowReducer(at("bag"), { kind: "toggle", slot: "image" }).slots).toEqual({
      text: true,
      image: true,
    });
  });

  it("bag + confirm(canConfirm true) -> hunting", () => {
    expect(flowReducer(at("bag"), { kind: "confirm", canConfirm: true }).step).toBe("hunting");
  });

  it("bag + confirm(canConfirm false) stays in bag", () => {
    const s = at("bag");
    expect(flowReducer(s, { kind: "confirm", canConfirm: false })).toBe(s);
  });

  it("hunting + ready -> revealed", () => {
    expect(flowReducer(at("hunting"), { kind: "ready" }).step).toBe("revealed");
  });

  it("hunting + fail -> lost", () => {
    expect(flowReducer(at("hunting"), { kind: "fail" }).step).toBe("lost");
  });

  it("revealed and lost + again -> home with slots reset", () => {
    const used = { text: false, image: true };
    for (const step of ["revealed", "lost"] as const) {
      expect(flowReducer(at(step, used), { kind: "again" })).toEqual(at("home"));
    }
  });
});

describe("flowReducer no-op events", () => {
  const events: FlowEvent[] = [
    { kind: "open-bag" },
    { kind: "close-bag" },
    { kind: "toggle", slot: "text" },
    { kind: "confirm", canConfirm: true },
    { kind: "ready" },
    { kind: "fail" },
    { kind: "again" },
  ];
  const valid: Record<FlowStep, string[]> = {
    home: ["open-bag"],
    bag: ["close-bag", "toggle", "confirm"],
    hunting: ["ready", "fail"],
    revealed: ["again"],
    lost: ["again"],
  };

  it("every event outside the table returns the same state object", () => {
    for (const step of Object.keys(valid) as FlowStep[]) {
      for (const ev of events) {
        if (valid[step].includes(ev.kind)) continue;
        const s = at(step);
        expect(flowReducer(s, ev)).toBe(s);
      }
    }
  });

  it("does not throw on malformed input", () => {
    const s = at("bag");
    expect(() => flowReducer(s, null as unknown as FlowEvent)).not.toThrow();
    expect(flowReducer(s, null as unknown as FlowEvent)).toBe(s);
    expect(flowReducer(s, { kind: "toggle", slot: "x" } as unknown as FlowEvent)).toBe(s);
    expect(flowReducer(null as unknown as FlowState, { kind: "open-bag" })).toBeNull();
  });
});

describe("canConfirm", () => {
  const file = {} as File;
  it("text slot on with non-blank text", () => {
    expect(canConfirm({ text: true, image: false }, "hello", null)).toBe(true);
  });
  it("text slot on with blank text", () => {
    expect(canConfirm({ text: true, image: false }, "   \n", null)).toBe(false);
  });
  it("text slot off ignores text", () => {
    expect(canConfirm({ text: false, image: false }, "hello", null)).toBe(false);
  });
  it("image slot on with a file", () => {
    expect(canConfirm({ text: false, image: true }, "", file)).toBe(true);
  });
  it("image slot on without a file", () => {
    expect(canConfirm({ text: false, image: true }, "", null)).toBe(false);
  });
  it("image slot off ignores the file", () => {
    expect(canConfirm({ text: true, image: false }, "", file)).toBe(false);
  });
  it("either compartment is enough when both are on", () => {
    expect(canConfirm({ text: true, image: true }, "", file)).toBe(true);
    expect(canConfirm({ text: true, image: true }, "hi", null)).toBe(true);
    expect(canConfirm({ text: true, image: true }, " ", null)).toBe(false);
  });
});

describe("shouldSubmitOnEnter", () => {
  const base = { key: "Enter", shiftKey: false, isComposing: false, canConfirm: true };
  it("plain Enter submits", () => {
    expect(shouldSubmitOnEnter(base)).toBe(true);
  });
  it("Shift+Enter does not submit", () => {
    expect(shouldSubmitOnEnter({ ...base, shiftKey: true })).toBe(false);
  });
  it("Enter during IME composition does not submit", () => {
    expect(shouldSubmitOnEnter({ ...base, isComposing: true })).toBe(false);
  });
  it("Enter when nothing can be confirmed does not submit", () => {
    expect(shouldSubmitOnEnter({ ...base, canConfirm: false })).toBe(false);
  });
  it("other keys do not submit", () => {
    expect(shouldSubmitOnEnter({ ...base, key: "a" })).toBe(false);
  });
});
