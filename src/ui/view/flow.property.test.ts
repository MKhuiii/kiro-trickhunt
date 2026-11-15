import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  canConfirm,
  flowReducer,
  shouldSubmitOnEnter,
  type FlowEvent,
  type FlowState,
  type FlowStep,
} from "./flow";

const STEPS: readonly FlowStep[] = ["home", "bag", "hunting", "revealed", "lost"];

const slotsArb = fc.record({ text: fc.boolean(), image: fc.boolean() });
const stateArb: fc.Arbitrary<FlowState> = fc.record({
  step: fc.constantFrom(...STEPS),
  slots: slotsArb,
});
const eventArb: fc.Arbitrary<FlowEvent> = fc.oneof(
  fc.constant<FlowEvent>({ kind: "open-bag" }),
  fc.constant<FlowEvent>({ kind: "close-bag" }),
  fc.constantFrom<"text" | "image">("text", "image").map(
    (slot): FlowEvent => ({ kind: "toggle", slot }),
  ),
  fc.boolean().map((c): FlowEvent => ({ kind: "confirm", canConfirm: c })),
  fc.constant<FlowEvent>({ kind: "ready" }),
  fc.constant<FlowEvent>({ kind: "fail" }),
  fc.constant<FlowEvent>({ kind: "again" }),
);

/** Which events each step reacts to (design A1 table). */
function fits(step: FlowStep, e: FlowEvent): boolean {
  switch (step) {
    case "home":
      return e.kind === "open-bag";
    case "bag":
      return (
        e.kind === "close-bag" ||
        e.kind === "toggle" ||
        (e.kind === "confirm" && e.canConfirm)
      );
    case "hunting":
      return e.kind === "ready" || e.kind === "fail";
    default:
      return e.kind === "again";
  }
}

describe("flow property tests (PBT-89)", () => {
  /**
   * **Validates: Requirements REQ-HUNT-06, REQ-HUNT-07, REQ-HUNT-16**
   */
  it("never throws, always returns a valid step, for any event sequence", () => {
    fc.assert(
      fc.property(stateArb, fc.array(eventArb, { maxLength: 40 }), (start, events) => {
        let s = start;
        for (const e of events) {
          s = flowReducer(s, e);
          expect(STEPS).toContain(s.step);
          expect(typeof s.slots.text).toBe("boolean");
          expect(typeof s.slots.image).toBe("boolean");
        }
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements REQ-HUNT-06, REQ-HUNT-07**
   */
  it("events that do not fit the step are no-ops", () => {
    fc.assert(
      fc.property(stateArb, eventArb, (s, e) => {
        fc.pre(!fits(s.step, e));
        expect(flowReducer(s, e)).toEqual(s);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements REQ-HUNT-16**
   */
  it("hunting is reached only from bag with a confirm whose canConfirm is true", () => {
    fc.assert(
      fc.property(stateArb, eventArb, (s, e) => {
        const next = flowReducer(s, e);
        if (next.step === "hunting" && s.step !== "hunting") {
          expect(s.step).toBe("bag");
          expect(e).toEqual({ kind: "confirm", canConfirm: true });
        }
      }),
      { numRuns: 300 },
    );
  });

  /**
   * **Validates: Requirements REQ-HUNT-06**
   */
  it("never throws on malformed events", () => {
    fc.assert(
      fc.property(stateArb, fc.anything(), (s, junk) => {
        const next = flowReducer(s, junk as FlowEvent);
        expect(STEPS).toContain(next.step);
      }),
      { numRuns: 100 },
    );
  });
});

describe("Enter rule property tests (PBT-94)", () => {
  /**
   * **Validates: Requirements REQ-HUNT-18**
   */
  it("is true only for Enter, no Shift, not composing, and canConfirm", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant("Enter"), fc.string(), fc.constantFrom("Tab", "Escape", " ")),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (key, shiftKey, isComposing, can) => {
          const out = shouldSubmitOnEnter({ key, shiftKey, isComposing, canConfirm: can });
          expect(out).toBe(key === "Enter" && !shiftKey && !isComposing && can);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("canConfirm property tests", () => {
  /**
   * **Validates: Requirements REQ-HUNT-16**
   */
  it("is false when no compartment holds usable content", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        expect(canConfirm({ text: false, image: false }, text, null)).toBe(false);
        expect(canConfirm({ text: true, image: true }, "   ", null)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
