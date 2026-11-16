"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { profileFor, stagePlan } from "../../ui";
import type { DeviceInfo, ScenePhase, StageProfile } from "../../ui";
import { createStageAdapter } from "./stage-adapter";
import type { ActorKind, ActorSpec, PixiLike, StageAdapter } from "./stage-adapter";
import type { CanvasLike } from "./light-textures";
import { browserRasterDeps, rasterizeSvg } from "./svg-texture";

interface PixiStageProps {
  readonly phase: ScenePhase;
  readonly reduceMotion: boolean;
  readonly highContrast: boolean;
  /** Changes when the actors on the page change (a new leg, a new monster). */
  readonly actorKey: string;
}

interface NavigatorHints {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Raster side per kind: the monster is shown the biggest. */
const RASTER_SIZE: Readonly<Record<ActorKind, number>> = {
  hunter: 512,
  shade: 512,
  monster: 768,
};

const ACTOR_KINDS: readonly ActorKind[] = ["hunter", "shade", "monster"];

/** Reads what the browser tells about the device. No identifier leaves the page. */
function detectDevice(): DeviceInfo {
  try {
    const probe = document.createElement("canvas");
    const webgl = probe.getContext("webgl2") !== null || probe.getContext("webgl") !== null;
    const nav = navigator as unknown as NavigatorHints;
    return {
      webgl,
      hardwareConcurrency: nav.hardwareConcurrency,
      deviceMemory: nav.deviceMemory,
      saveData: nav.connection?.saveData === true,
    };
  } catch {
    return { webgl: false };
  }
}

function createCanvas(width: number, height: number): CanvasLike {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas as unknown as CanvasLike;
}

/**
 * Decorative PixiJS atmosphere above the SVG scene. The SVG scene is always
 * there; this layer adds fog, light and small creatures when Pixi starts, and
 * then paints the hunter, the shade and the monster itself (from the page's own
 * SVG drawings, marked with `data-actor`), hiding the SVG copy only after the
 * canvas copy exists. It is hidden from assistive technology and never takes
 * pointer events. `pixi.js` is loaded lazily after the first screen and
 * destroyed on unmount.
 */
export function PixiStage({
  phase,
  reduceMotion,
  highContrast,
  actorKey,
}: PixiStageProps): ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<StageAdapter | null>(null);
  const [profile, setProfile] = useState<StageProfile>("off");
  // Rasterized pictures by "id:key", so a pose that comes back is not drawn twice.
  const pictures = useRef(new Map<string, CanvasLike>());
  const shown = useRef(new Map<string, HTMLElement>());
  const syncToken = useRef(0);

  const plan = useMemo(
    () => stagePlan({ phase }, { reduceMotion }, profile),
    [phase, reduceMotion, profile],
  );
  const planRef = useRef(plan);
  planRef.current = plan;
  const contrastRef = useRef(highContrast);
  contrastRef.current = highContrast;

  // Pick the profile after mount, so the server and the first client render match.
  useEffect(() => {
    setProfile(profileFor(detectDevice()));
  }, []);

  const clearShown = (): void => {
    for (const node of shown.current.values()) delete node.dataset.canvasActor;
    shown.current.clear();
  };

  // Find the drawings on the page that the canvas should paint, and hand them to the stage.
  const syncActors = (): void => {
    const adapter = adapterRef.current;
    const host = hostRef.current;
    if (adapter === null || host === null) return;
    const token = (syncToken.current += 1);
    const root: ParentNode = host.parentElement ?? document;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-actor]")).filter((n) =>
      ACTOR_KINDS.includes(n.dataset.actor as ActorKind),
    );

    const rasterDeps = browserRasterDeps(createCanvas);
    const pending = nodes.map(async (node) => {
      const kind = node.dataset.actor as ActorKind;
      const svg = node.querySelector("svg");
      if (svg === null) return null;
      const key = `${kind}:${node.dataset.actorKey ?? ""}:${contrastRef.current}`;
      let picture = pictures.current.get(key);
      if (picture === undefined) {
        picture = await rasterizeSvg(
          svg,
          { size: RASTER_SIZE[kind], highContrast: contrastRef.current },
          rasterDeps,
        );
        pictures.current.set(key, picture);
      }
      const spec: ActorSpec = {
        id: kind,
        kind,
        texture: picture,
        getRect: () => (node.isConnected ? node.getBoundingClientRect() : null),
      };
      return { spec, node };
    });

    void Promise.allSettled(pending).then((results) => {
      // A newer sync started, or the stage was closed while the pictures were made.
      if (token !== syncToken.current || adapterRef.current !== adapter) return;
      const ready = results.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
      adapter.setActors(ready.map((r) => r.spec));
      const ids = new Set(ready.map((r) => r.spec.id));
      for (const [id, node] of [...shown.current]) {
        if (!ids.has(id)) {
          delete node.dataset.canvasActor;
          shown.current.delete(id);
        }
      }
      for (const { spec, node } of ready) {
        const previous = shown.current.get(spec.id);
        if (previous !== undefined && previous !== node) delete previous.dataset.canvasActor;
        // Only now, with the canvas copy in place, the SVG copy is hidden.
        node.dataset.canvasActor = "on";
        shown.current.set(spec.id, node);
      }
      adapter.refresh();
    });
  };
  const syncRef = useRef(syncActors);
  syncRef.current = syncActors;

  // Start Pixi when the device allows it; fall back silently otherwise.
  useEffect(() => {
    if (profile === "off") return;
    const host = hostRef.current;
    if (host === null) return;
    let cancelled = false;
    let created: StageAdapter | null = null;

    const dropAdapter = (adapter: StageAdapter | null): void => {
      syncToken.current += 1;
      clearShown();
      adapter?.dispose();
    };

    const start = async (): Promise<void> => {
      try {
        const mod = await import("pixi.js");
        if (cancelled) return;
        const adapter = await createStageAdapter({
          pixi: mod as unknown as PixiLike,
          container: host,
          createCanvas,
          random: Math.random,
          resolution: window.devicePixelRatio || 1,
          maxFps: profile === "low" ? 24 : 30,
          getContainerRect: () => host.getBoundingClientRect(),
          visibility: {
            isHidden: () => document.hidden,
            onChange: (listener) => {
              document.addEventListener("visibilitychange", listener);
              return () => document.removeEventListener("visibilitychange", listener);
            },
          },
          onLost: () => {
            // The canvas is gone: show the SVG drawings again.
            const lost = adapterRef.current;
            adapterRef.current = null;
            dropAdapter(lost);
          },
        });
        if (cancelled) {
          adapter.dispose();
          return;
        }
        created = adapter;
        adapterRef.current = adapter;
        adapter.update(planRef.current);
        syncRef.current();
      } catch {
        // No WebGL or Pixi failed to start: the SVG scene stays and no error is shown.
      }
    };

    const idle = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    if (typeof idle.requestIdleCallback === "function") {
      idleId = idle.requestIdleCallback(() => void start(), { timeout: 1500 });
    } else {
      timerId = setTimeout(() => void start(), 300);
    }

    // The stage keeps its own frame when no ticker runs: redraw after a resize.
    const onResize = (): void => adapterRef.current?.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      if (idleId !== null) idle.cancelIdleCallback?.(idleId);
      if (timerId !== null) clearTimeout(timerId);
      if (adapterRef.current === created) adapterRef.current = null;
      dropAdapter(created);
    };
  }, [profile]);

  // Apply every new plan.
  useEffect(() => {
    adapterRef.current?.update(plan);
  }, [plan]);

  // The drawings on the page changed (a new step, leg or monster, or the contrast setting).
  useEffect(() => {
    syncRef.current();
  }, [phase, actorKey, highContrast]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      data-stage={profile}
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
    />
  );
}
