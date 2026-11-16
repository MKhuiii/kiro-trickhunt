import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MONSTER_PRESENTATION } from "../monsters";
import { sceneFor } from "./scene";
import { MAX_GAIN, MIN_FADE_S, soundPlan } from "./sound-plan";

// PBT-97 (REQ-HUNT-75).

const LEGS = ["forest", "mountain", "swamp", "ruins"];
const MONSTER_KEYS = Object.keys(MONSTER_PRESENTATION);

const sceneArb = fc
  .oneof(
    fc.constantFrom("home", "bag", "lost").map((step) => ({ step })),
    fc.constantFrom(...LEGS).map((leg) => ({ step: "hunting", leg })),
    fc.constantFrom(...MONSTER_KEYS).map((monster) => ({ step: "revealed", monster })),
    fc.anything(),
  )
  .map((input) => sceneFor(input));

describe("soundPlan property tests (PBT-97)", () => {
  /** **Validates: Requirements REQ-HUNT-75** */
  it("returns no cue when sound is not exactly true", () => {
    fc.assert(
      fc.property(sceneArb, fc.oneof(fc.constant({ sound: false }), fc.anything()), (scene, prefs) => {
        const sound = (prefs as { sound?: unknown } | null)?.sound;
        if (sound === true) return;
        expect(soundPlan(scene, prefs as never).cues).toEqual([]);
      }),
      { numRuns: 200 },
    );
  });

  /** **Validates: Requirements REQ-HUNT-75** */
  it("every cue is at most MAX_GAIN with fades of at least MIN_FADE_S", () => {
    fc.assert(
      fc.property(sceneArb, (scene) => {
        for (const cue of soundPlan(scene, { sound: true }).cues) {
          expect(cue.gain).toBeGreaterThan(0);
          expect(cue.gain).toBeLessThanOrEqual(MAX_GAIN);
          expect(cue.fadeInS).toBeGreaterThanOrEqual(MIN_FADE_S);
          expect(cue.fadeOutS).toBeGreaterThanOrEqual(MIN_FADE_S);
        }
      }),
      { numRuns: 200 },
    );
  });

  /** **Validates: Requirements REQ-HUNT-75** */
  it("never throws for any input", () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), (scene, prefs) => {
        const plan = soundPlan(scene as never, prefs as never);
        expect(Array.isArray(plan.cues)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
