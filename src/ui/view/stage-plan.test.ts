import { describe, expect, it } from "vitest";
import { sceneFor } from "./scene";
import {
  MAX_CAMERA_DRIFT,
  MAX_FLICKER_HZ,
  MAX_PULSE_HZ,
  PARTICLE_CAP,
  profileFor,
  stagePlan,
} from "./stage-plan";

const HOME = sceneFor({ step: "home" });
const HUNT = sceneFor({ step: "hunting", leg: "swamp" });
const REVEAL = sceneFor({ step: "revealed", monster: "bank" });
const LOST = sceneFor({ step: "lost" });
const MOTION = { reduceMotion: false };
const STILL = { reduceMotion: true };

function total(plan: ReturnType<typeof stagePlan>): number {
  return plan.particles.reduce((n, p) => n + p.count, 0);
}

describe("stagePlan", () => {
  it("is disabled for profile off", () => {
    const plan = stagePlan(HOME, MOTION, "off");
    expect(plan.enabled).toBe(false);
    expect(plan.layers).toEqual([]);
    expect(plan.particles).toEqual([]);
  });

  it("is disabled for an unknown profile", () => {
    expect(stagePlan(HOME, MOTION, "turbo" as never).enabled).toBe(false);
  });

  it("has fog, vignette and lantern light on the home scene", () => {
    const plan = stagePlan(HOME, MOTION, "normal");
    const ids = plan.layers.map((l) => l.id);
    expect(plan.enabled).toBe(true);
    expect(ids).toEqual(
      expect.arrayContaining(["fog-far", "fog-mid", "fog-near", "vignette", "lantern-light"]),
    );
    expect(plan.heartbeat).toBe(false);
  });

  it("makes the vignette breathe while hunting", () => {
    const plan = stagePlan(HUNT, MOTION, "normal");
    const vignette = plan.layers.find((l) => l.id === "vignette");
    expect(plan.heartbeat).toBe(true);
    expect(vignette?.motion).toBe("pulse");
    expect(vignette?.hz).toBeLessThanOrEqual(MAX_PULSE_HZ);
    expect(plan.cameraDrift).toBeGreaterThan(0);
  });

  it("is darkest at the reveal and drifts the camera at most 2%", () => {
    const reveal = stagePlan(REVEAL, MOTION, "normal");
    const home = stagePlan(HOME, MOTION, "normal");
    expect(reveal.darkness).toBeGreaterThan(home.darkness);
    expect(reveal.cameraDrift).toBeLessThanOrEqual(MAX_CAMERA_DRIFT);
  });

  it("keeps only still layers and no particles with reduced motion", () => {
    for (const scene of [HOME, HUNT, REVEAL, LOST]) {
      const plan = stagePlan(scene, STILL, "normal");
      expect(plan.enabled).toBe(true);
      expect(plan.particles).toEqual([]);
      expect(plan.layers.every((l) => l.motion === "still" && l.hz === 0)).toBe(true);
      expect(plan.layers.map((l) => l.id)).toEqual(["vignette", "lantern-light"]);
      expect(plan.cameraDrift).toBe(0);
      expect(plan.heartbeat).toBe(false);
      expect(plan.animateActors).toBe(false);
    }
  });

  it("animates the actors only when motion is allowed and the stage is on", () => {
    expect(stagePlan(HUNT, MOTION, "normal").animateActors).toBe(true);
    expect(stagePlan(REVEAL, MOTION, "low").animateActors).toBe(true);
    expect(stagePlan(HUNT, MOTION, "off").animateActors).toBe(false);
    expect(stagePlan(HUNT, STILL, "normal").animateActors).toBe(false);
  });

  it("caps particles by profile", () => {
    for (const scene of [HOME, HUNT, REVEAL, LOST]) {
      expect(total(stagePlan(scene, MOTION, "low"))).toBeLessThanOrEqual(PARTICLE_CAP.low);
      expect(total(stagePlan(scene, MOTION, "normal"))).toBeLessThanOrEqual(PARTICLE_CAP.normal);
    }
    expect(total(stagePlan(HUNT, MOTION, "normal"))).toBe(14);
    expect(total(stagePlan(HUNT, MOTION, "low"))).toBe(6);
  });

  it("sweeps the lantern light only at the reveal and never with reduced motion", () => {
    expect(stagePlan(REVEAL, MOTION, "normal").lightSweep).toBe(true);
    expect(stagePlan(HOME, MOTION, "normal").lightSweep).toBe(false);
    expect(stagePlan(HUNT, MOTION, "normal").lightSweep).toBe(false);
    expect(stagePlan(REVEAL, STILL, "normal").lightSweep).toBe(false);
  });

  it("keeps flicker at most 1.5 Hz", () => {
    const plan = stagePlan(HOME, MOTION, "normal");
    for (const layer of plan.layers.filter((l) => l.motion === "flicker")) {
      expect(layer.hz).toBeLessThanOrEqual(MAX_FLICKER_HZ);
    }
  });

  it("treats a malformed scene as lost and never throws", () => {
    expect(() => stagePlan(null, null, "normal")).not.toThrow();
    expect(stagePlan(undefined, undefined, "normal").enabled).toBe(true);
    const odd = stagePlan({ phase: "nope" } as never, MOTION, "normal");
    expect(odd.darkness).toBe(stagePlan(LOST, MOTION, "normal").darkness);
  });
});

describe("profileFor", () => {
  it("is off without WebGL", () => {
    expect(profileFor({ webgl: false })).toBe("off");
  });

  it("is low for save-data, few cores or little memory", () => {
    expect(profileFor({ saveData: true })).toBe("low");
    expect(profileFor({ hardwareConcurrency: 2 })).toBe("low");
    expect(profileFor({ deviceMemory: 2 })).toBe("low");
  });

  it("is normal for a capable or unknown device", () => {
    expect(profileFor({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe("normal");
    expect(profileFor({})).toBe("normal");
    expect(profileFor(null)).toBe("normal");
    expect(profileFor({ hardwareConcurrency: Number.NaN })).toBe("normal");
  });
});
