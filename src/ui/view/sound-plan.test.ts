import { describe, expect, it } from "vitest";
import { sceneFor } from "./scene";
import { MAX_GAIN, MIN_FADE_S, soundPlan } from "./sound-plan";

const ON = { sound: true };
const OFF = { sound: false };

function ids(scene: ReturnType<typeof sceneFor>, prefs = ON): string[] {
  return soundPlan(scene, prefs).cues.map((c) => c.id);
}

describe("soundPlan", () => {
  it("has no cue when sound is off", () => {
    for (const input of [
      { step: "home" },
      { step: "bag" },
      { step: "hunting", leg: "forest" },
      { step: "revealed", monster: "bank" },
      { step: "lost" },
    ]) {
      expect(soundPlan(sceneFor(input), OFF).cues).toEqual([]);
    }
  });

  it("plays wind on every step", () => {
    for (const input of [
      { step: "home" },
      { step: "bag" },
      { step: "hunting", leg: "swamp" },
      { step: "revealed", monster: "prize" },
      { step: "lost" },
    ]) {
      expect(ids(sceneFor(input))).toContain("wind");
    }
  });

  it("adds a creak at the bag, a heartbeat while hunting and a swell at the reveal", () => {
    expect(ids(sceneFor({ step: "bag" }))).toEqual(["wind", "creak"]);
    expect(ids(sceneFor({ step: "hunting", leg: "ruins" }))).toEqual(["wind", "heartbeat"]);
    expect(ids(sceneFor({ step: "revealed", monster: "generic" }))).toEqual(["wind", "swell"]);
    expect(ids(sceneFor({ step: "home" }))).toEqual(["wind"]);
    expect(ids(sceneFor({ step: "lost" }))).toEqual(["wind"]);
  });

  it("loops the wind and the heartbeat, and plays creak and swell once", () => {
    const hunting = soundPlan(sceneFor({ step: "hunting", leg: "forest" }), ON).cues;
    expect(hunting.every((c) => c.loop)).toBe(true);
    const bag = soundPlan(sceneFor({ step: "bag" }), ON).cues;
    expect(bag.find((c) => c.id === "creak")?.loop).toBe(false);
  });

  it("keeps every cue quiet and softly faded", () => {
    for (const input of [
      { step: "bag" },
      { step: "hunting", leg: "forest" },
      { step: "revealed", monster: "bank" },
    ]) {
      for (const cue of soundPlan(sceneFor(input), ON).cues) {
        expect(cue.gain).toBeLessThanOrEqual(MAX_GAIN);
        expect(cue.fadeInS).toBeGreaterThanOrEqual(MIN_FADE_S);
        expect(cue.fadeOutS).toBeGreaterThanOrEqual(MIN_FADE_S);
      }
    }
  });

  it("gives no cue for a malformed scene or preference", () => {
    expect(soundPlan(null, ON).cues).toEqual([]);
    expect(soundPlan({ phase: "nope" } as never, ON).cues).toEqual([]);
    expect(soundPlan(sceneFor({ step: "home" }), null).cues).toEqual([]);
    expect(soundPlan(sceneFor({ step: "home" }), { sound: "yes" } as never).cues).toEqual([]);
  });
});
