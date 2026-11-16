import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Source scan for the ambient sound (REQ-HUNT-74 to REQ-HUNT-76): generated only.

const DIR = resolve(__dirname);

function strip(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

describe("audio sources", () => {
  const files = readdirSync(DIR).filter((f) => /\.tsx?$/.test(f) && !/\.test\.ts$/.test(f));

  it("scans the host and the hook", () => {
    expect(files).toEqual(expect.arrayContaining(["audio-host.ts", "useAmbientSound.ts"]));
  });

  it("uses no file, no network, no storage and no console", () => {
    for (const f of files) {
      const code = strip(readFileSync(join(DIR, f), "utf8"));
      expect(code, f).not.toMatch(/\bfetch\s*\(/);
      expect(code, f).not.toMatch(/\bnew\s+Audio\s*\(/);
      expect(code, f).not.toMatch(/decodeAudioData|createMediaElementSource/);
      expect(code, f).not.toMatch(/\.(mp3|ogg|wav|m4a|webm)\b/i);
      expect(code, f).not.toMatch(/https?:\/\//i);
      expect(code, f).not.toMatch(/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/);
      expect(code, f).not.toMatch(/\bconsole\s*\./);
    }
  });

  it("creates the audio context only through the factory parameter", () => {
    const host = strip(readFileSync(join(DIR, "audio-host.ts"), "utf8"));
    expect(host).not.toMatch(/new\s+(webkit)?AudioContext/);
    expect(host).toMatch(/deps\.createContext\(\)/);
  });
});
