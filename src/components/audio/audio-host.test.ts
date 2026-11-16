import { describe, expect, it } from "vitest";
import { sceneFor } from "../../ui/view/scene";
import { MAX_GAIN, soundPlan } from "../../ui/view/sound-plan";
import { createAudioHost } from "./audio-host";
import type {
  AudioContextLike,
  AudioHostDeps,
  AudioParamLike,
  BufferLike,
  FilterNodeLike,
  GainNodeLike,
  OscillatorLike,
} from "./audio-host";

class FakeParam implements AudioParamLike {
  value = 0;
  ramps: number[] = [];
  setValueAtTime(value: number): void {
    this.value = value;
  }
  linearRampToValueAtTime(value: number): void {
    this.ramps.push(value);
  }
  cancelScheduledValues(): void {}
}

class FakeNode {
  connected: unknown[] = [];
  connect(dest: unknown): void {
    this.connected.push(dest);
  }
  disconnect(): void {}
}

class FakeGain extends FakeNode implements GainNodeLike {
  gain = new FakeParam();
}

class FakeFilter extends FakeNode implements FilterNodeLike {
  type = "";
  frequency = new FakeParam();
  Q = new FakeParam();
}

class FakeOsc extends FakeNode implements OscillatorLike {
  type = "";
  frequency = new FakeParam();
  started = false;
  stopped = false;
  start(): void {
    this.started = true;
  }
  stop(): void {
    this.stopped = true;
  }
}

class FakeCtx implements AudioContextLike {
  currentTime = 0;
  sampleRate = 8000;
  destination = {};
  gains: FakeGain[] = [];
  oscs: FakeOsc[] = [];
  sources: { started: boolean; loop: boolean }[] = [];
  state: "running" | "suspended" | "closed" = "running";
  calls: string[] = [];
  createGain(): GainNodeLike {
    const g = new FakeGain();
    this.gains.push(g);
    return g;
  }
  createBiquadFilter(): FilterNodeLike {
    return new FakeFilter();
  }
  createOscillator(): OscillatorLike {
    const o = new FakeOsc();
    this.oscs.push(o);
    return o;
  }
  createBuffer(_c: number, length: number): BufferLike {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  createBufferSource() {
    const s = Object.assign(new FakeNode(), {
      buffer: null as unknown,
      loop: false,
      started: false,
      start(): void {
        s.started = true;
      },
      stop(): void {},
    });
    this.sources.push(s);
    return s;
  }
  async resume(): Promise<void> {
    this.calls.push("resume");
    this.state = "running";
  }
  async suspend(): Promise<void> {
    this.calls.push("suspend");
    this.state = "suspended";
  }
  async close(): Promise<void> {
    this.calls.push("close");
    this.state = "closed";
  }
}

interface Harness {
  deps: AudioHostDeps;
  created: FakeCtx[];
  vis: { hidden: boolean; listeners: Set<() => void> };
  timers: { active: Set<unknown> };
}

function harness(noAudio = false): Harness {
  const created: FakeCtx[] = [];
  const vis = { hidden: false, listeners: new Set<() => void>() };
  const timers = { active: new Set<unknown>() };
  let id = 0;
  const deps: AudioHostDeps = {
    createContext: () => {
      if (noAudio) return null;
      const c = new FakeCtx();
      created.push(c);
      return c;
    },
    visibility: {
      isHidden: () => vis.hidden,
      onChange: (fn) => {
        vis.listeners.add(fn);
        return () => vis.listeners.delete(fn);
      },
    },
    timers: {
      setInterval: () => {
        id += 1;
        timers.active.add(id);
        return id;
      },
      clearInterval: (x) => {
        timers.active.delete(x);
      },
    },
    random: () => 0.5,
  };
  return { deps, created, vis, timers };
}

const ON = { sound: true };
const plan = (input: Parameters<typeof sceneFor>[0]) => soundPlan(sceneFor(input), ON);

describe("createAudioHost", () => {
  it("creates no context before a user gesture", () => {
    const h = harness();
    const host = createAudioHost(h.deps);
    host.apply(plan({ step: "home" }));
    expect(h.created).toHaveLength(0);
  });

  it("creates the context at the gesture when there is something to play", () => {
    const h = harness();
    const host = createAudioHost(h.deps);
    host.apply(plan({ step: "home" }));
    host.unlock();
    expect(h.created).toHaveLength(1);
    expect(h.created[0].sources.length).toBe(1);
  });

  it("creates nothing when sound is off, even after a gesture", () => {
    const h = harness();
    const host = createAudioHost(h.deps);
    host.apply(soundPlan(sceneFor({ step: "home" }), { sound: false }));
    host.unlock();
    expect(h.created).toHaveLength(0);
  });

  it("starts the context when sound is turned on after the gesture", () => {
    const h = harness();
    const host = createAudioHost(h.deps);
    host.unlock();
    host.apply(plan({ step: "home" }));
    expect(h.created).toHaveLength(1);
  });

  it("never sets a gain above the maximum and fades in", () => {
    const h = harness();
    const host = createAudioHost(h.deps);
    host.unlock();
    for (const input of [
      { step: "home" },
      { step: "bag" },
      { step: "hunting", leg: "forest" },
      { step: "revealed", monster: "bank" },
    ] as const) {
      host.apply(plan(input));
    }
    const ctx = h.created[0];
    expect(ctx.gains.length).toBeGreaterThan(0);
    // The gain nodes that feed the speakers carry the level. Inner envelopes only shape it.
    const output = ctx.gains.filter((g) => g.connected.includes(ctx.destination));
    expect(output.length).toBeGreaterThan(0);
    for (const g of output) {
      for (const peak of g.gain.ramps) expect(peak).toBeLessThanOrEqual(MAX_GAIN);
    }
  });

  it("plays one-shot cues once per scene and the heartbeat while hunting", () => {
    const h = harness();
    const host = createAudioHost(h.deps);
    host.unlock();
    host.apply(plan({ step: "bag" }));
    const ctx = h.created[0];
    const afterBag = ctx.oscs.length;
    host.apply(plan({ step: "bag" }));
    expect(ctx.oscs.length).toBe(afterBag);
    host.apply(plan({ step: "hunting", leg: "swamp" }));
    expect(h.timers.active.size).toBe(1);
    host.apply(plan({ step: "home" }));
    expect(h.timers.active.size).toBe(0);
  });

  it("suspends in a hidden tab and resumes when visible", () => {
    const h = harness();
    const host = createAudioHost(h.deps);
    host.unlock();
    host.apply(plan({ step: "home" }));
    const ctx = h.created[0];
    h.vis.hidden = true;
    for (const fn of h.vis.listeners) fn();
    expect(ctx.calls).toContain("suspend");
    h.vis.hidden = false;
    for (const fn of h.vis.listeners) fn();
    expect(ctx.calls.at(-1)).toBe("resume");
  });

  it("suspends when the plan becomes empty", () => {
    const h = harness();
    const host = createAudioHost(h.deps);
    host.unlock();
    host.apply(plan({ step: "home" }));
    host.apply(soundPlan(sceneFor({ step: "home" }), { sound: false }));
    expect(h.created[0].calls).toContain("suspend");
  });

  it("disposes once: closes the context, clears timers and listeners", () => {
    const h = harness();
    const host = createAudioHost(h.deps);
    host.unlock();
    host.apply(plan({ step: "hunting", leg: "ruins" }));
    host.dispose();
    host.dispose();
    const ctx = h.created[0];
    expect(ctx.calls.filter((c) => c === "close")).toHaveLength(1);
    expect(h.timers.active.size).toBe(0);
    expect(h.vis.listeners.size).toBe(0);
    host.apply(plan({ step: "home" }));
    host.unlock();
    expect(h.created).toHaveLength(1);
  });

  it("stays silent and does not throw when the browser has no Web Audio", () => {
    const h = harness(true);
    const host = createAudioHost(h.deps);
    host.unlock();
    expect(() => host.apply(plan({ step: "home" }))).not.toThrow();
    expect(() => host.apply(plan({ step: "bag" }))).not.toThrow();
  });
});
