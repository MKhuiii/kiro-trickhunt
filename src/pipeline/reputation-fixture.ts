/**
 * Shared test helper: the `reputation` field of a full `Verdict` fixture
 * when no link lookup was requested.
 */

import type { ReputationOutcome } from "./verdict";

export const NO_REPUTATION: ReputationOutcome = Object.freeze({
  status: "not-requested",
  checkedCount: 0,
});
