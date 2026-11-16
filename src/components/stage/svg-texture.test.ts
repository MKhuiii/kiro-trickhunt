import { describe, expect, it } from "vitest";
import { rasterizeSvg } from "./svg-texture";
import type { ImageLike, RasterDeps } from "./svg-texture";
import type { CanvasLike, Context2DLike } from "./light-textures";

interface Calls {
  readonly blobs: string[];
  readonly revoked: string[];
  readonly drawn: { w: number; h: number }[];
}

function harness(opts: { fail?: boolean; noContext?: boolean } = {}): { deps: RasterDeps; calls: Calls } {
  const calls: Calls = { blobs: [], revoked: [], drawn: [] };
  const ctx = {
    drawImage: (_i: unknown, _x: number, _y: number, w: number, h: number) => {
      calls.drawn.push({ w, h });
    },
  } as unknown as Context2DLike;
  const deps: RasterDeps = {
    serialize: () =>
      '<svg viewBox="0 0 200 200" width="100%" height="100%"><path style="fill:var(--th-ink)"/></svg>',
    resolveVar: (name) => (name === "--th-ink" ? "#102030" : ""),
    createBlobUrl: (markup) => {
      calls.blobs.push(markup);
      return `blob:test/${calls.blobs.length}`;
    },
    revokeBlobUrl: (url) => {
      calls.revoked.push(url);
    },
    loadImage: async (): Promise<ImageLike> => {
      if (opts.fail) throw new Error("load failed");
      return { width: 512, height: 512 };
    },
    createCanvas: (width, height): CanvasLike => ({
      width,
      height,
      getContext: () => (opts.noContext ? null : ctx),
    }),
  };
  return { deps, calls };
}

describe("rasterizeSvg", () => {
  it("draws the art onto a square canvas with its theme colors inlined", async () => {
    const { deps, calls } = harness();
    const canvas = await rasterizeSvg({}, { size: 512, highContrast: false }, deps);
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);
    expect(calls.drawn).toEqual([{ w: 512, h: 512 }]);
    expect(calls.blobs[0]).toContain("fill:#102030");
    expect(calls.blobs[0]).toContain('width="512"');
  });

  it("revokes the blob address after success", async () => {
    const { deps, calls } = harness();
    await rasterizeSvg({}, { size: 64, highContrast: false }, deps);
    expect(calls.revoked).toEqual(calls.blobs.map((_b, i) => `blob:test/${i + 1}`));
  });

  it("revokes the blob address and rejects when the image fails to load", async () => {
    const { deps, calls } = harness({ fail: true });
    await expect(rasterizeSvg({}, { size: 64, highContrast: false }, deps)).rejects.toThrow();
    expect(calls.revoked).toHaveLength(1);
  });

  it("rejects when there is no 2D context, still revoking", async () => {
    const { deps, calls } = harness({ noContext: true });
    await expect(rasterizeSvg({}, { size: 64, highContrast: false }, deps)).rejects.toThrow();
    expect(calls.revoked).toHaveLength(1);
  });

  it("never creates an address for markup that is not plain art", async () => {
    const { deps, calls } = harness();
    deps.serialize = () => "<svg><script>1</script></svg>";
    await expect(rasterizeSvg({}, { size: 64, highContrast: false }, deps)).rejects.toThrow();
    expect(calls.blobs).toHaveLength(0);
  });
});
