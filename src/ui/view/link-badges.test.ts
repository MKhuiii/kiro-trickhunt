import { describe, expect, it } from "vitest";
import { linkBadgesForGroup } from "./link-badges";
import type { LinkCreatureView } from "./link-creatures-view";
import type { SignalGroupView } from "./result-view";

function creature(id: string, signalIds: string[]): LinkCreatureView {
  return { id, signalIds } as unknown as LinkCreatureView;
}

function group(source: string, ids: string[]): SignalGroupView {
  return {
    source,
    labelKey: "source.url",
    cards: ids.map((signalId) => ({ signalId })),
  } as unknown as SignalGroupView;
}

describe("linkBadgesForGroup", () => {
  const a = creature("a", ["url.x", "url.y"]);
  const b = creature("b", ["url.z"]);

  it("gives each creature to the first matching card only", () => {
    const g = group("url", ["url.q", "url.y", "url.x", "url.z"]);
    expect(linkBadgesForGroup(g, [a, b])).toEqual([null, a, null, b]);
  });

  it("gives a later creature to a later card with the same signal", () => {
    const a2 = creature("a2", ["url.x"]);
    const g = group("url", ["url.x", "url.x"]);
    expect(linkBadgesForGroup(g, [a, a2])).toEqual([a, a2]);
  });

  it("returns all null for other groups, even with url ids", () => {
    const g = group("text", ["url.x"]);
    expect(linkBadgesForGroup(g, [a])).toEqual([null]);
  });

  it("returns all null for an empty creature list", () => {
    expect(linkBadgesForGroup(group("url", ["url.x", "url.y"]), [])).toEqual([null, null]);
  });

  it("is total on garbage and does not mutate", () => {
    expect(linkBadgesForGroup(group("url", ["url.x"]), null as never)).toEqual([null]);
    expect(linkBadgesForGroup(null as never, [a])).toEqual([]);
    const g = group("url", ["url.x"]);
    const before = JSON.stringify([g, a]);
    linkBadgesForGroup(g, [a]);
    expect(JSON.stringify([g, a])).toBe(before);
  });
});
