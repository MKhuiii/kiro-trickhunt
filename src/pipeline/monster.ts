/**
 * monster.ts — Deterministic monster selection (REQ-PIPE-33 to 35, 67).
 * Pure function: presence-based weight sum over distinct signal ids.
 *
 * At level `suspicious` a specific monster also needs supporting signals from
 * at least two different overlap groups (a signal outside every group is its
 * own group). At `high` and `critical` the gate does not apply.
 */

import type { Signal } from "../core";
import {
  GENERIC,
  MONSTERS,
  MONSTER_ORDER,
  MONSTER_THRESHOLD,
} from "./monsters.config";
import { OVERLAP_GROUPS } from "./overlap.config";
import type { MonsterId, RiskLevel } from "./verdict";

const GROUP_BY_ID: ReadonlyMap<string, number> = new Map(
  OVERLAP_GROUPS.flatMap((group, index) =>
    group.map((id) => [id, index] as const),
  ),
);

function groupKey(id: string): string {
  const index = GROUP_BY_ID.get(id);
  return index === undefined ? `id:${id}` : `group:${index}`;
}

export function selectMonster(
  level: RiskLevel,
  signals: readonly Signal[],
): MonsterId | null {
  if (level === "no_signals") return null;

  const ids = new Set<string>();
  for (const s of signals) ids.add(s.id);

  const needsTwoGroups = level === "suspicious";

  let best: MonsterId = GENERIC;
  let bestTotal = 0;

  for (const id of MONSTER_ORDER) {
    const def = MONSTERS.find((m) => m.id === id);
    if (!def) continue;
    let total = 0;
    const groups = new Set<string>();
    for (const sid of ids) {
      const w = def.weights[sid];
      if (typeof w === "number") {
        total += w;
        if (w > 0) groups.add(groupKey(sid));
      }
    }
    if (needsTwoGroups && groups.size < 2) continue;
    // Strict ">" keeps the earlier MONSTER_ORDER entry on ties.
    if (total >= MONSTER_THRESHOLD && total > bestTotal) {
      best = id;
      bestTotal = total;
    }
  }

  return best;
}
