---
inclusion: fileMatch
fileMatchPattern: "src/pipeline/**"
---
# Verdict rules
- Never produce a verdict, level or text that says a message is "safe".
  Levels are only no_signals, suspicious, high, critical.
- Combination rules and monster selection may only raise risk, never lower it.
  One exception exists: the awareness adjustment in `awareness.config.ts` and
  `awareness.ts` may lower `high` to `suspicious` (one step, score at most 49)
  for a scam warning, only when the LLM marks it and every fixed condition
  holds. It never lowers `critical`, never reaches `no_signals`, and has a
  config switch. Do not add any other lowering path without a spec change.
- The awareness adjustment never applies to a result that has a
  `url.reputation-listed` signal (it is in `BLOCKING_SIGNAL_IDS`). The floor of
  `high` for a listed link is a combination rule in `rules.config.ts`, so it
  can only raise. A failed, missing or "not listed" lookup adds no signal and
  changes nothing. "Not listed" is never "safe".
- The reputation checker is injected like the LLM client. src/pipeline must not
  import src/server/reputation.
- Weights, thresholds, overlap groups, monsters, actions and limitation texts
  live in config files, not in code.
- Actions and explanations come from config; the LLM never writes them.
- The pipeline never rejects and never throws; failures become degraded status.
- src/pipeline must not import next, react, window, document, process or
  anything from src/server. The LLM client is injected.
- Never log or store user text.
