import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { en } from "../i18n/en";
import { MONSTER_PRESENTATION } from "../monsters";
import { sceneFor } from "./scene";

const PHASES = ["home", "bag", "hunting", "revealed", "lost"];
const LEGS = ["forest", "mountain", "swamp", "ruins"];
const MONSTER_KEYS = Object.keys(MONSTER_PRESENTATION);

const validInput = fc.oneof(
  fc.constantFrom("home", "bag", "lost").map((step) => ({ step })),
  fc.constantFrom(...LEGS).map((leg) => ({ step: "hunting", leg })),
  fc.constantFrom(...MONSTER_KEYS).map((monster) => ({ step: "revealed", monster })),
);
const anyInput = fc.oneof(
  validInput,
  fc.anything(),
  fc.record({ step: fc.string(), leg: fc.anything(), monster: fc.anything() }),
  fc.record({
    step: fc.constantFrom(...PHASES),
    leg: fc.anything(),
    monster: fc.anything(),
  }),
);

describe("scene property tests (PBT-91)", () => {
  /**
   * **Validates: Requirements REQ-HUNT-08, REQ-HUNT-09**
   */
  it("never throws and returns a valid phase and an existing caption key", () => {
    fc.assert(
      fc.property(anyInput, (input) => {
        const view = sceneFor(input);
        expect(PHASES).toContain(view.phase);
        expect(Object.hasOwn(en, view.captionKey)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  /**
   * **Validates: Requirements REQ-HUNT-08, REQ-HUNT-09**
   */
  it("leg is set only for hunting and monster only for revealed", () => {
    fc.assert(
      fc.property(anyInput, (input) => {
        const view = sceneFor(input);
        if (view.phase === "hunting") expect(LEGS).toContain(view.leg);
        else expect(view.leg).toBeNull();
        if (view.phase === "revealed") expect(MONSTER_KEYS).toContain(view.monster);
        else expect(view.monster).toBeNull();
      }),
      { numRuns: 300 },
    );
  });
});
