import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MONSTER_PRESENTATION } from "../monsters";
import { sceneFor } from "./scene";
import {
  MAX_CAMERA_DRIFT,
  MAX_FLICKER_HZ,
  MAX_PULSE_HZ,
  PARTICLE_CAP,
  profileFor,
  stagePlan,
} from "./stage-plan";

// PBT-95 (REQ-HUNT-56, REQ-HUNT-57, REQ-HUNT-63).

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

const profileArb = fc.constantFrom("off", "low", "normal") as fc.Arbitrary<
  "off" | "low" | "normal"
>;
const prefsArb = fc.record({ reduceMotion: fc.boolean() });

describe("stagePlan property tests (PBT-95)", () => {
  /** **Validates: Requirements REQ-HUNT-57** */
  it("never throws and returns a well-formed plan", () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), fc.anything(), (scene, prefs, profile) => {
        const plan = stagePlan(scene as never, prefs as never, profile as never);
        expect(typeof plan.enabled).toBe("boolean");
        expect(Array.isArray(plan.layers)).toBe(true);
        expect(Array.isArray(plan.particles)).toBe(true);
        expect(plan.darkness).toBeGreaterThanOrEqual(0);
        expect(plan.darkness).toBeLessThanOrEqual(1);
      }),
      { numRuns: 300 },
    );
  });

  /** **Validates: Requirements REQ-HUNT-63** */
  it("has no moving layer, no particle and no camera drift with reduced motion", () => {
    fc.assert(
      fc.property(sceneArb, profileArb, (scene, profile) => {
        const plan = stagePlan(scene, { reduceMotion: true }, profile);
        expect(plan.particles).toEqual([]);
        expect(plan.cameraDrift).toBe(0);
        expect(plan.heartbeat).toBe(false);
        expect(plan.lightSweep).toBe(false);
        expect(plan.animateActors).toBe(false);
        for (const layer of plan.layers) {
          expect(layer.motion).toBe("still");
          expect(layer.hz).toBe(0);
        }
      }),
      { numRuns: 300 },
    );
  });

  /** **Validates: Requirements REQ-HUNT-56, REQ-HUNT-57** */
  it("caps particles by profile and keeps flicker, pulse and camera in range", () => {
    fc.assert(
      fc.property(sceneArb, prefsArb, profileArb, (scene, prefs, profile) => {
        const plan = stagePlan(scene, prefs, profile);
        const total = plan.particles.reduce((n, p) => n + p.count, 0);
        expect(total).toBeLessThanOrEqual(PARTICLE_CAP[profile]);
        for (const p of plan.particles) {
          expect(Number.isInteger(p.count)).toBe(true);
          expect(p.count).toBeGreaterThan(0);
        }
        for (const layer of plan.layers) {
          if (layer.motion === "flicker") expect(layer.hz).toBeLessThanOrEqual(MAX_FLICKER_HZ);
          if (layer.motion === "pulse") expect(layer.hz).toBeLessThanOrEqual(MAX_PULSE_HZ);
          expect(layer.alpha).toBeGreaterThanOrEqual(0);
          expect(layer.alpha).toBeLessThanOrEqual(1);
        }
        expect(plan.cameraDrift).toBeLessThanOrEqual(MAX_CAMERA_DRIFT);
        if (profile === "off") expect(plan.enabled).toBe(false);
      }),
      { numRuns: 300 },
    );
  });

  /** **Validates: Requirements REQ-HUNT-54** */
  it("profileFor never throws and returns a known profile", () => {
    fc.assert(
      fc.property(fc.anything(), (device) => {
        expect(["off", "low", "normal"]).toContain(profileFor(device as never));
      }),
      { numRuns: 200 },
    );
  });
});
