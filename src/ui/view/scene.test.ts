import { describe, expect, it } from "vitest";
import { sceneFor } from "./scene";

describe("sceneFor table rows", () => {
  it("home", () => {
    expect(sceneFor({ step: "home" })).toEqual({
      phase: "home",
      leg: null,
      captionKey: "scene.home.caption",
      monster: null,
    });
  });

  it("bag", () => {
    expect(sceneFor({ step: "bag" })).toEqual({
      phase: "bag",
      leg: null,
      captionKey: "scene.bag.caption",
      monster: null,
    });
  });

  it.each(["forest", "mountain", "swamp", "ruins"] as const)("hunting %s", (leg) => {
    expect(sceneFor({ step: "hunting", leg })).toEqual({
      phase: "hunting",
      leg,
      captionKey: `scene.hunt.${leg}`,
      monster: null,
    });
  });

  it.each(["bank", "prize", "job-bait", "authority", "generic"] as const)(
    "revealed with monster %s",
    (monster) => {
      expect(sceneFor({ step: "revealed", monster })).toEqual({
        phase: "revealed",
        leg: null,
        captionKey: "scene.reveal.found",
        monster,
      });
    },
  );

  it("revealed neutral", () => {
    expect(sceneFor({ step: "revealed", monster: "neutral" })).toEqual({
      phase: "revealed",
      leg: null,
      captionKey: "scene.reveal.nothing",
      monster: "neutral",
    });
  });

  it("lost", () => {
    expect(sceneFor({ step: "lost" })).toEqual({
      phase: "lost",
      leg: null,
      captionKey: "scene.lost.caption",
      monster: null,
    });
  });
});

describe("sceneFor malformed input gives lost", () => {
  const lost = {
    phase: "lost",
    leg: null,
    captionKey: "scene.lost.caption",
    monster: null,
  };
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["string", "home"],
    ["number", 3],
    ["empty object", {}],
    ["unknown step", { step: "dancing" }],
    ["hunting without leg", { step: "hunting" }],
    ["hunting with bad leg", { step: "hunting", leg: "moon" }],
    ["revealed without monster", { step: "revealed" }],
    ["revealed with bad monster", { step: "revealed", monster: "dragon" }],
  ])("%s", (_name, input) => {
    expect(sceneFor(input)).toEqual(lost);
  });
});
