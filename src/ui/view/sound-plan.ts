/**
 * Sound plan for the optional ambient sound (design R2-A, REQ-HUNT-75).
 * Pure and total. It only describes cues; the audio adapter makes the sound.
 */

import type { ScenePhase, SceneView } from "./scene";

export type CueId = "wind" | "heartbeat" | "creak" | "swell";

export interface SoundCue {
  readonly id: CueId;
  /** Peak gain, at most `MAX_GAIN`. */
  readonly gain: number;
  /** Seconds, at least `MIN_FADE_S`. */
  readonly fadeInS: number;
  readonly fadeOutS: number;
  /** True: keeps playing while the scene lasts. False: plays once when the scene starts. */
  readonly loop: boolean;
}

export interface SoundPlan {
  readonly cues: readonly SoundCue[];
}

export const MAX_GAIN = 0.2;
export const MIN_FADE_S = 0.5;

const PHASES: readonly ScenePhase[] = ["home", "bag", "hunting", "revealed", "lost"];

const NONE: SoundPlan = { cues: [] };

const WIND: SoundCue = { id: "wind", gain: 0.1, fadeInS: 2, fadeOutS: 2, loop: true };
const HEARTBEAT: SoundCue = { id: "heartbeat", gain: 0.18, fadeInS: 1, fadeOutS: 1, loop: true };
const CREAK: SoundCue = { id: "creak", gain: 0.14, fadeInS: 0.5, fadeOutS: 0.8, loop: false };
const SWELL: SoundCue = { id: "swell", gain: 0.18, fadeInS: 1.5, fadeOutS: 2, loop: false };

export function soundPlan(
  scene: Pick<SceneView, "phase"> | null | undefined,
  prefs: { readonly sound: boolean } | null | undefined,
): SoundPlan {
  try {
    if (prefs?.sound !== true) return NONE;
    const rawPhase: unknown = scene?.phase;
    const phase: ScenePhase | null =
      typeof rawPhase === "string" && (PHASES as readonly string[]).includes(rawPhase)
        ? (rawPhase as ScenePhase)
        : null;
    if (phase === null) return NONE;
    switch (phase) {
      case "bag":
        return { cues: [WIND, CREAK] };
      case "hunting":
        return { cues: [WIND, HEARTBEAT] };
      case "revealed":
        return { cues: [WIND, SWELL] };
      default:
        return { cues: [WIND] };
    }
  } catch {
    return NONE;
  }
}
