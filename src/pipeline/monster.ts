/**
 * monster.ts — Deterministic monster selection (REQ-PIPE-33 to 35).
 * Pure function: presence-based weight sum over distinct signal ids.
 */

import type { Signal } from "../core";
import {
  GENERIC,
  MONSTERS,
  MONSTER_ORDER,
  MONSTER_THRESHOLD,
} from "./monsters.config";
import type { MonsterId, RiskLevel } from "./verdict";

export function selectMonster(
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
    // Strict ">" keeps the earlier MONSTER_ORDER entry on ties.
    if (total >= MONSTER_THRESHOLD && total > bestTotal) {
      best = id;
      bestTotal = total;
    }
  }

  return best;
}
