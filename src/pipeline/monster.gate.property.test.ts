/**
 * Overlap-group gate of selectMonster (REQ-PIPE-67, option A).
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createSignal } from "../core";
import type { Signal } from "../core";

import { selectMonster } from "./monster";
import {
  GENERIC,
  MONSTERS,
  MONSTER_ORDER,
  MONSTER_THRESHOLD,
} from "./monsters.config";
import { OVERLAP_GROUPS } from "./overlap.config";
import type { MonsterId, RiskLevel } from "./verdict";

function sig(id: string): Signal {
  return createSignal({
    id,
    source: id.startsWith("url.") ? "url" : id.startsWith("semantic.") ? "semantic" : "text",
    severity: 0.5,
    evidence: "ev",
    whyItMatters: "because",
  });
}

/** Copy of the selectMonster logic before the gate. Test-only. */
function oldSelectMonster(
  level: RiskLevel,
  signals: readonly Signal[],
): MonsterId | null {
  if (level === "no_signals") return null;
  const ids = new Set<string>();
  for (const s of signals) ids.add(s.id);
  let best: MonsterId = GENERIC;
  let bestTotal = 0;
  for (const id of MONSTER_ORDER) {
    const def = MONSTERS.find((m) => m.id === id);
    if (!def) continue;
    let total = 0;
    for (const sid of ids) {
      const w = def.weights[sid];
      if (typeof w === "number") total += w;
    }
    if (total >= MONSTER_THRESHOLD && total > bestTotal) {
      best = id;
      bestTotal = total;
    }
  }
  return best;
}

const groupOf = (id: string): string => {
  const i = OVERLAP_GROUPS.findIndex((g) => g.includes(id));
  return i < 0 ? `id:${id}` : `group:${i}`;
};

const ALL_IDS: readonly string[] = [
  ...new Set([
    ...MONSTERS.flatMap((m) => Object.keys(m.weights)),
    ...OVERLAP_GROUPS.flat(),
    "text.urgency",
    "url.ip-host",
    "unknown.id",
  ]),
];

// (monster, a, b): different groups, and that monster is the only one that
// supports both ids with a total at or above the threshold.
const CROSS_GROUP_CASES: readonly (readonly [MonsterId, string, string])[] =
  MONSTERS.flatMap((m) => {
    const ids = Object.keys(m.weights);
    const out: (readonly [MonsterId, string, string])[] = [];
    for (const a of ids) {
      for (const b of ids) {
        if (a >= b || groupOf(a) === groupOf(b)) continue;
        if (m.weights[a] + m.weights[b] < MONSTER_THRESHOLD) continue;
        const supporters = MONSTERS.filter(
          (o) => (o.weights[a] ?? 0) > 0 && (o.weights[b] ?? 0) > 0,
        );
        if (supporters.length === 1) out.push([m.id, a, b]);
      }
    }
    return out;
  });

describe("selectMonster overlap-group gate", () => {
  // PBT-86
  // **Validates: Requirements REQ-PIPE-67**
  it("(a) signals from one overlap group at suspicious give generic", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...OVERLAP_GROUPS),
        fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 2, maxLength: 5 }),
        (group, picks) => {
          const signals = picks.map((i) => sig(group[i % group.length]));
          expect(selectMonster("suspicious", signals)).toBe("generic");
        },
      ),
      { numRuns: 200 },
    );
  });

  it("(a) both ids of every group together give generic at suspicious", () => {
    for (const group of OVERLAP_GROUPS) {
      expect(selectMonster("suspicious", group.map(sig))).toBe("generic");
    }
  });

  // PBT-87
  // **Validates: Requirements REQ-PIPE-67, REQ-PIPE-68**
  it("(b) two different groups supporting one monster give that monster at suspicious", () => {
    // Exhaustive: every case is checked, not a sample.
    expect(CROSS_GROUP_CASES.length).toBeGreaterThan(0);
    for (const [monster, a, b] of CROSS_GROUP_CASES) {
      expect(selectMonster("suspicious", [sig(a), sig(b)])).toBe(monster);
    }
  });

  // PBT-88
  // **Validates: Requirements REQ-PIPE-67, REQ-PIPE-71**
  it("(c) at high and critical the result equals the old logic", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<RiskLevel>("high", "critical"),
        fc.array(fc.constantFrom(...ALL_IDS), { maxLength: 8 }),
        (level, ids) => {
          const signals = ids.map(sig);
          expect(selectMonster(level, signals)).toBe(oldSelectMonster(level, signals));
        },
      ),
      { numRuns: 500 },
    );
  });
});
