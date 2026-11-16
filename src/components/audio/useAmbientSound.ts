"use client";

import { useEffect, useRef } from "react";
import { soundPlan } from "../../ui";
import type { ScenePhase } from "../../ui";
import { createAudioHost } from "./audio-host";
import type { AudioContextLike, AudioHost } from "./audio-host";

interface AudioWindow {
  AudioContext?: new () => unknown;
  webkitAudioContext?: new () => unknown;
}

function createContext(): AudioContextLike | null {
  const w = window as unknown as AudioWindow;
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  return Ctor === undefined ? null : (new Ctor() as AudioContextLike);
}

/**
 * Optional ambient sound. Off unless `enabled`. The audio context is created
 * only after the user's first pointer or key press, never before. Everything is
 * generated; nothing is downloaded.
 */
export function useAmbientSound(phase: ScenePhase, enabled: boolean): void {
  const hostRef = useRef<AudioHost | null>(null);

  useEffect(() => {
    const host = createAudioHost({
      createContext,
      visibility: {
        isHidden: () => document.hidden,
        onChange: (listener) => {
          document.addEventListener("visibilitychange", listener);
          return () => document.removeEventListener("visibilitychange", listener);
        },
      },
      timers: {
        setInterval: (fn, ms) => window.setInterval(fn, ms),
        clearInterval: (id) => window.clearInterval(id as number),
      },
      random: Math.random,
    });
    hostRef.current = host;
    const unlock = (): void => host.unlock();
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      host.dispose();
      hostRef.current = null;
    };
  }, []);

  useEffect(() => {
    hostRef.current?.apply(soundPlan({ phase }, { sound: enabled }));
  }, [phase, enabled]);
}
