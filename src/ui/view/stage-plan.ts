/**
 * Stage plan for the PixiJS atmosphere layer (design R2-A, REQ-HUNT-56, 57, 61, 63).
 * Pure and total: it decides what the stage shows and never touches Pixi.
 */

import type { SceneView, ScenePhase } from "./scene";

export type StageProfile = "off" | "low" | "normal";

export type StageLayerId =
  | "fog-far"
  | "fog-mid"
  | "fog-near"
  | "trees"
  | "vignette"
  | "lantern-light";

export type StageMotion = "still" | "drift" | "sway" | "flicker" | "pulse";

export interface StageLayer {
  readonly id: StageLayerId;
  readonly motion: StageMotion;
  /** Cycles per second. 0 for a still layer. */
  readonly hz: number;
  readonly alpha: number;
}

export type ParticleKind = "firefly" | "bat" | "crow" | "eyes";

export interface StageParticles {
  readonly kind: ParticleKind;
  readonly count: number;
}

export interface StagePlan {
  /** False: keep the SVG scene only. */
  readonly enabled: boolean;
  readonly layers: readonly StageLayer[];
  readonly particles: readonly StageParticles[];
  /** 0..1, how dark the scene is. */
  readonly darkness: number;
  /** Fraction of the view the camera may drift (at most 0.02). */
  readonly cameraDrift: number;
  /** The vignette breathes like a heartbeat while hunting. */
  readonly heartbeat: boolean;
  /** The lantern light sweeps once across the scene at the reveal. */
  readonly lightSweep: boolean;
  /** The hunter, the shade and the monster move and breathe (they are drawn in the canvas). */
  readonly animateActors: boolean;
}

/** Limits from REQ-HUNT-56. */
export const MAX_FLICKER_HZ = 1.5;
export const MAX_PULSE_HZ = 0.5;
export const MAX_CAMERA_DRIFT = 0.02;
export const PARTICLE_CAP: Readonly<Record<StageProfile, number>> = {
  off: 0,
  low: 6,
  normal: 18,
};

const FLICKER_HZ = 0.8;
const PULSE_HZ = 0.45;

const PHASES: readonly ScenePhase[] = ["home", "bag", "hunting", "revealed", "lost"];

const DISABLED: StagePlan = {
  enabled: false,
  layers: [],
  particles: [],
  darkness: 0,
  cameraDrift: 0,
  heartbeat: false,
  lightSweep: false,
  animateActors: false,
};

const DARKNESS: Readonly<Record<ScenePhase, number>> = {
  home: 0.55,
  bag: 0.6,
  hunting: 0.7,
  revealed: 0.85,
  lost: 0.8,
};

const CAMERA: Readonly<Record<ScenePhase, number>> = {
  home: 0,
  bag: 0,
  hunting: 0.01,
  revealed: MAX_CAMERA_DRIFT,
  lost: 0,
};

/** Wanted particles per phase, most important first. The profile cap trims from the end. */
const WANTED: Readonly<Record<ScenePhase, readonly StageParticles[]>> = {
  home: [
    { kind: "firefly", count: 6 },
    { kind: "eyes", count: 2 },
    { kind: "bat", count: 1 },
    { kind: "crow", count: 1 },
  ],
  bag: [
    { kind: "firefly", count: 4 },
    { kind: "eyes", count: 2 },
  ],
  hunting: [
    { kind: "firefly", count: 6 },
    { kind: "eyes", count: 3 },
    { kind: "bat", count: 3 },
    { kind: "crow", count: 2 },
  ],
  revealed: [
    { kind: "eyes", count: 2 },
    { kind: "firefly", count: 3 },
  ],
  lost: [
    { kind: "crow", count: 3 },
    { kind: "eyes", count: 2 },
  ],
};

function isPhase(v: unknown): v is ScenePhase {
  return typeof v === "string" && (PHASES as readonly string[]).includes(v);
}

function isProfile(v: unknown): v is StageProfile {
  return v === "off" || v === "low" || v === "normal";
}

function capParticles(list: readonly StageParticles[], cap: number): StageParticles[] {
  const out: StageParticles[] = [];
  let left = Math.max(0, Math.floor(cap));
  for (const p of list) {
    if (left <= 0) break;
    const count = Math.min(p.count, left);
    if (count > 0) out.push({ kind: p.kind, count });
    left -= count;
  }
  return out;
}

function movingLayers(phase: ScenePhase, darkness: number, heartbeat: boolean): StageLayer[] {
  const layers: StageLayer[] = [
    { id: "fog-far", motion: "drift", hz: 0.01, alpha: 0.35 },
    { id: "fog-mid", motion: "drift", hz: 0.015, alpha: 0.3 },
    { id: "fog-near", motion: "drift", hz: 0.02, alpha: 0.25 },
  ];
  if (phase === "home" || phase === "hunting") {
    layers.push({ id: "trees", motion: "sway", hz: 0.11, alpha: 0.9 });
  }
  layers.push(
    heartbeat
      ? { id: "vignette", motion: "pulse", hz: PULSE_HZ, alpha: darkness }
      : { id: "vignette", motion: "still", hz: 0, alpha: darkness },
    { id: "lantern-light", motion: "flicker", hz: FLICKER_HZ, alpha: 0.8 },
  );
  return layers;
}

function stillLayers(darkness: number): StageLayer[] {
  return [
    { id: "vignette", motion: "still", hz: 0, alpha: darkness },
    { id: "lantern-light", motion: "still", hz: 0, alpha: 0.8 },
  ];
}

/**
 * What the stage shows for a scene. `profile: "off"` or an unknown input keeps
 * the SVG scene only. Reduced motion keeps only still layers and no particles.
 */
export function stagePlan(
  scene: Pick<SceneView, "phase"> | null | undefined,
  prefs: { readonly reduceMotion: boolean } | null | undefined,
  profile: StageProfile,
): StagePlan {
  try {
    if (!isProfile(profile) || profile === "off") return DISABLED;
    const rawPhase: unknown = scene?.phase;
    const phase: ScenePhase = isPhase(rawPhase) ? rawPhase : "lost";
    const reduced = prefs?.reduceMotion === true;
    const darkness = DARKNESS[phase];

    if (reduced) {
      return {
        enabled: true,
        layers: stillLayers(darkness),
        particles: [],
        darkness,
        cameraDrift: 0,
        heartbeat: false,
        lightSweep: false,
        animateActors: false,
      };
    }

    const heartbeat = phase === "hunting";
    return {
      enabled: true,
      layers: movingLayers(phase, darkness, heartbeat),
      particles: capParticles(WANTED[phase], PARTICLE_CAP[profile]),
      darkness,
      cameraDrift: Math.min(CAMERA[phase], MAX_CAMERA_DRIFT),
      heartbeat,
      lightSweep: phase === "revealed",
      animateActors: true,
    };
  } catch {
    return DISABLED;
  }
}

export interface DeviceInfo {
  readonly webgl?: boolean;
  readonly hardwareConcurrency?: number;
  readonly deviceMemory?: number;
  readonly saveData?: boolean;
}

function finiteAtMost(v: unknown, max: number): boolean {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v <= max;
}

/** Maps device facts to a profile. Missing facts count as a normal device. */
export function profileFor(device: DeviceInfo | null | undefined): StageProfile {
  try {
    if (device?.webgl === false) return "off";
    if (
      device?.saveData === true ||
      finiteAtMost(device?.hardwareConcurrency, 2) ||
      finiteAtMost(device?.deviceMemory, 2)
    ) {
      return "low";
    }
    return "normal";
  } catch {
    return "off";
  }
}
