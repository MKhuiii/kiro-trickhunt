/**
 * Optional ambient sound (design R2-E, REQ-HUNT-74 to REQ-HUNT-76).
 *
 * Everything is made from noise and oscillators with the Web Audio API: no
 * file, no network. The `AudioContext` is created only after a user gesture
 * (`unlock`), through a factory that is a parameter, so tests can pass a fake.
 * Sound never carries information that is not also on screen.
 */

import type { SoundCue, SoundPlan } from "../../ui/view/sound-plan";
import { MAX_GAIN } from "../../ui/view/sound-plan";

/* ---------- The small part of Web Audio the host uses ---------- */

export interface AudioParamLike {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  cancelScheduledValues(time: number): unknown;
}

export interface AudioNodeLike {
  connect(destination: unknown): unknown;
  disconnect(): void;
}

export interface GainNodeLike extends AudioNodeLike {
  readonly gain: AudioParamLike;
}

export interface FilterNodeLike extends AudioNodeLike {
  type: string;
  readonly frequency: AudioParamLike;
  readonly Q: AudioParamLike;
}

export interface OscillatorLike extends AudioNodeLike {
  type: string;
  readonly frequency: AudioParamLike;
  start(when?: number): void;
  stop(when?: number): void;
}

export interface BufferLike {
  getChannelData(channel: number): Float32Array;
}

export interface BufferSourceLike extends AudioNodeLike {
  buffer: unknown;
  loop: boolean;
  start(when?: number): void;
  stop(when?: number): void;
}

export interface AudioContextLike {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly destination: unknown;
  createGain(): GainNodeLike;
  createBiquadFilter(): FilterNodeLike;
  createOscillator(): OscillatorLike;
  createBuffer(channels: number, length: number, sampleRate: number): BufferLike;
  createBufferSource(): BufferSourceLike;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  close(): Promise<void>;
}

export interface TimersLike {
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(id: unknown): void;
}

export interface AudioVisibilityLike {
  isHidden(): boolean;
  onChange(listener: () => void): () => void;
}

export interface AudioHostDeps {
  /** Returns null when the browser has no Web Audio. */
  readonly createContext: () => AudioContextLike | null;
  readonly visibility: AudioVisibilityLike;
  readonly timers: TimersLike;
  readonly random: () => number;
}

export interface AudioHost {
  /** Remember what should play. Nothing is created before `unlock`. */
  apply(plan: SoundPlan): void;
  /** Call from a user gesture (pointer or key). Creates the context once. */
  unlock(): void;
  dispose(): void;
}

interface Running {
  readonly cue: SoundCue;
  readonly gain: GainNodeLike;
  /** Stops the sources and clears timers. */
  readonly stop: (at: number) => void;
}

const HEARTBEAT_LOOKAHEAD_S = 8;
const HEARTBEAT_PERIOD_S = 1;

export function createAudioHost(deps: AudioHostDeps): AudioHost {
  let ctx: AudioContextLike | null = null;
  let plan: SoundPlan = { cues: [] };
  let disposed = false;
  let gestured = false;
  let createFailed = false;
  const running = new Map<SoundCue["id"], Running>();
  const playedOnce = new Set<SoundCue["id"]>();
  let noise: BufferLike | null = null;

  const peak = (cue: SoundCue): number => Math.min(MAX_GAIN, Math.max(0, cue.gain));

  const noiseBuffer = (c: AudioContextLike): BufferLike => {
    if (noise !== null) return noise;
    const length = Math.floor(c.sampleRate * 2);
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = deps.random() * 2 - 1;
    noise = buffer;
    return buffer;
  };

  const fadeIn = (g: GainNodeLike, c: AudioContextLike, cue: SoundCue): void => {
    const now = c.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak(cue), now + cue.fadeInS);
  };

  const fadeOut = (g: GainNodeLike, c: AudioContextLike, seconds: number): number => {
    const now = c.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + seconds);
    return now + seconds;
  };

  /**
   * Level note: the sources below are normalized to a healthy level on their own
   * (noise through a band-pass loses most of its power, so it gets make-up gain).
   * The node that feeds the speakers is always the cue's `gain`, at most `MAX_GAIN`.
   */
  const startWind = (c: AudioContextLike, cue: SoundCue): Running => {
    const source = c.createBufferSource();
    source.buffer = noiseBuffer(c);
    source.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 450;
    filter.Q.value = 0.5;
    const makeup = c.createGain();
    makeup.gain.value = 3;
    // A slow swell of the wind: the filter centre drifts up and down.
    const lfo = c.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.08;
    const depth = c.createGain();
    depth.gain.value = 200;
    lfo.connect(depth);
    depth.connect(filter.frequency);
    const gain = c.createGain();
    source.connect(filter);
    filter.connect(makeup);
    makeup.connect(gain);
    gain.connect(c.destination);
    fadeIn(gain, c, cue);
    source.start();
    lfo.start();
    return {
      cue,
      gain,
      stop: (at) => {
        source.stop(at);
        lfo.stop(at);
      },
    };
  };

  const startHeartbeat = (c: AudioContextLike, cue: SoundCue): Running => {
    // A thump that falls in pitch, with a higher partial so small speakers can play it.
    const body = c.createOscillator();
    body.type = "sine";
    body.frequency.value = 90;
    const partial = c.createOscillator();
    partial.type = "sine";
    partial.frequency.value = 180;
    const bodyLevel = c.createGain();
    bodyLevel.gain.value = 0.7;
    const partialLevel = c.createGain();
    partialLevel.gain.value = 0.3;
    const env = c.createGain();
    env.gain.value = 0;
    const gain = c.createGain();
    body.connect(bodyLevel);
    partial.connect(partialLevel);
    bodyLevel.connect(env);
    partialLevel.connect(env);
    env.connect(gain);
    gain.connect(c.destination);
    fadeIn(gain, c, cue);
    body.start();
    partial.start();
    let scheduledUntil = c.currentTime;
    const schedule = (): void => {
      const from = Math.max(scheduledUntil, c.currentTime);
      for (let t = from; t < c.currentTime + HEARTBEAT_LOOKAHEAD_S; t += HEARTBEAT_PERIOD_S) {
        // lub-dub: a firm thump, then a softer one.
        body.frequency.setValueAtTime(110, t);
        body.frequency.linearRampToValueAtTime(60, t + 0.16);
        partial.frequency.setValueAtTime(220, t);
        partial.frequency.linearRampToValueAtTime(120, t + 0.16);
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(1, t + 0.03);
        env.gain.linearRampToValueAtTime(0, t + 0.22);
        body.frequency.setValueAtTime(100, t + 0.3);
        body.frequency.linearRampToValueAtTime(58, t + 0.46);
        partial.frequency.setValueAtTime(200, t + 0.3);
        partial.frequency.linearRampToValueAtTime(116, t + 0.46);
        env.gain.setValueAtTime(0, t + 0.3);
        env.gain.linearRampToValueAtTime(0.6, t + 0.33);
        env.gain.linearRampToValueAtTime(0, t + 0.5);
        scheduledUntil = t + HEARTBEAT_PERIOD_S;
      }
    };
    schedule();
    const timer = deps.timers.setInterval(schedule, 4000);
    return {
      cue,
      gain,
      stop: (at) => {
        deps.timers.clearInterval(timer);
        body.stop(at);
        partial.stop(at);
      },
    };
  };

  const startCreak = (c: AudioContextLike, cue: SoundCue): Running => {
    // A door hinge: a sawtooth that rises and falls, with a sharp resonance.
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    const now = c.currentTime;
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(190, now + 0.45);
    osc.frequency.linearRampToValueAtTime(100, now + 0.95);
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 700;
    filter.Q.value = 6;
    const makeup = c.createGain();
    makeup.gain.value = 2.5;
    const gain = c.createGain();
    osc.connect(filter);
    filter.connect(makeup);
    makeup.connect(gain);
    gain.connect(c.destination);
    fadeIn(gain, c, cue);
    osc.start();
    // A one-shot: fade out after the rise and stop a little later.
    gain.gain.linearRampToValueAtTime(0, now + cue.fadeInS + cue.fadeOutS);
    osc.stop(now + cue.fadeInS + cue.fadeOutS + 0.1);
    return { cue, gain, stop: (at) => osc.stop(at) };
  };

  const startSwell = (c: AudioContextLike, cue: SoundCue): Running => {
    // A low, dark chord that rises and fades. Notes above 100 Hz so phones can play them.
    const a = c.createOscillator();
    const b = c.createOscillator();
    a.type = "triangle";
    b.type = "triangle";
    a.frequency.value = 110;
    b.frequency.value = 164.8;
    const levelA = c.createGain();
    levelA.gain.value = 0.55;
    const levelB = c.createGain();
    levelB.gain.value = 0.45;
    const gain = c.createGain();
    a.connect(levelA);
    b.connect(levelB);
    levelA.connect(gain);
    levelB.connect(gain);
    gain.connect(c.destination);
    fadeIn(gain, c, cue);
    a.start();
    b.start();
    const end = c.currentTime + cue.fadeInS + cue.fadeOutS;
    gain.gain.linearRampToValueAtTime(0, end);
    a.stop(end + 0.1);
    b.stop(end + 0.1);
    return {
      cue,
      gain,
      stop: (at) => {
        a.stop(at);
        b.stop(at);
      },
    };
  };
  const start = (c: AudioContextLike, cue: SoundCue): Running => {
    switch (cue.id) {
      case "wind":
        return startWind(c, cue);
      case "heartbeat":
        return startHeartbeat(c, cue);
      case "creak":
        return startCreak(c, cue);
      default:
        return startSwell(c, cue);
    }
  };

  const retire = (id: SoundCue["id"]): void => {
    const c = ctx;
    const r = running.get(id);
    if (c === null || r === undefined) return;
    running.delete(id);
    try {
      r.stop(fadeOut(r.gain, c, Math.max(0.5, r.cue.fadeOutS)) + 0.05);
    } catch {
      // A source that already stopped is fine.
    }
  };

  const sync = (): void => {
    if (disposed) return;
    // The context is made only after a user gesture, and only when something should play.
    if (ctx === null && gestured && !createFailed && plan.cues.length > 0) {
      try {
        ctx = deps.createContext();
      } catch {
        ctx = null;
      }
      if (ctx === null) createFailed = true;
    }
    const c = ctx;
    if (c === null) return;
    const wanted = new Map(plan.cues.map((cue) => [cue.id, cue] as const));
    for (const id of [...running.keys()]) {
      if (!wanted.has(id)) retire(id);
    }
    for (const id of [...playedOnce]) {
      if (!wanted.has(id)) playedOnce.delete(id);
    }
    for (const cue of plan.cues) {
      if (cue.loop) {
        if (!running.has(cue.id)) running.set(cue.id, start(c, cue));
      } else if (!playedOnce.has(cue.id)) {
        playedOnce.add(cue.id);
        running.set(cue.id, start(c, cue));
      }
    }
    if (plan.cues.length === 0 && running.size === 0) {
      void c.suspend().catch(() => undefined);
    } else if (!deps.visibility.isHidden()) {
      void c.resume().catch(() => undefined);
    }
  };

  const stopWatching = deps.visibility.onChange(() => {
    const c = ctx;
    if (c === null || disposed) return;
    if (deps.visibility.isHidden()) void c.suspend().catch(() => undefined);
    else if (running.size > 0) void c.resume().catch(() => undefined);
  });

  return {
    apply(next: SoundPlan): void {
      if (disposed) return;
      plan = next;
      sync();
    },
    unlock(): void {
      if (disposed) return;
      gestured = true;
      sync();
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      stopWatching();
      const c = ctx;
      if (c === null) return;
      for (const r of running.values()) {
        try {
          r.stop(c.currentTime);
        } catch {
          // Already stopped.
        }
      }
      running.clear();
      void c.close().catch(() => undefined);
      ctx = null;
    },
  };
}
