/**
 * Scene view for the hunter UI (design A3).
 * Pure and total: malformed input gives the `lost` scene.
 */

import type { MessageKey } from "../i18n/en";
import { MONSTER_PRESENTATION } from "../monsters";
import type { MonsterKey } from "../monsters";
import type { FlowStep } from "./flow";
import type { Leg } from "./journey";

export type ScenePhase = FlowStep;

export type SceneInput =
  | { readonly step: "home" }
  | { readonly step: "bag" }
  | { readonly step: "hunting"; readonly leg: Leg }
  | { readonly step: "revealed"; readonly monster: MonsterKey }
  | { readonly step: "lost" };

export interface SceneView {
  readonly phase: ScenePhase;
  readonly leg: Leg | null;
  readonly captionKey: MessageKey;
  readonly monster: MonsterKey | null;
}

const HUNT_CAPTIONS: Readonly<Record<Leg, MessageKey>> = {
  forest: "scene.hunt.forest",
  mountain: "scene.hunt.mountain",
  swamp: "scene.hunt.swamp",
  ruins: "scene.hunt.ruins",
};

const LOST: SceneView = {
  phase: "lost",
  leg: null,
  captionKey: "scene.lost.caption",
  monster: null,
};

function isLeg(v: unknown): v is Leg {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(HUNT_CAPTIONS, v);
}

function isMonsterKey(v: unknown): v is MonsterKey {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(MONSTER_PRESENTATION, v);
}

export function sceneFor(input: unknown): SceneView {
  try {
    if (typeof input !== "object" || input === null) return LOST;
    const rec = input as Record<string, unknown>;
    switch (rec.step) {
      case "home":
        return { phase: "home", leg: null, captionKey: "scene.home.caption", monster: null };
      case "bag":
        return { phase: "bag", leg: null, captionKey: "scene.bag.caption", monster: null };
      case "hunting": {
        const leg = rec.leg;
        if (!isLeg(leg)) return LOST;
        return { phase: "hunting", leg, captionKey: HUNT_CAPTIONS[leg], monster: null };
      }
      case "revealed": {
        const monster = rec.monster;
        if (!isMonsterKey(monster)) return LOST;
        return {
          phase: "revealed",
          leg: null,
          captionKey: monster === "neutral" ? "scene.reveal.nothing" : "scene.reveal.found",
          monster,
        };
      }
      default:
        return LOST;
    }
  } catch {
    return LOST;
  }
}
