---
inclusion: fileMatch
fileMatchPattern: "src/pipeline/**"
---
# Verdict rules
- Never produce a verdict, level or text that says a message is "safe".
  Levels are only no_signals, suspicious, high, critical.
- Combination rules and monster selection may only raise risk, never lower it.
- Weights, thresholds, overlap groups, monsters, actions and limitation texts
  live in config files, not in code.
- Actions and explanations come from config; the LLM never writes them.
- The pipeline never rejects and never throws; failures become degraded status.
- src/pipeline must not import next, react, window, document, process or
  anything from src/server. The LLM client is injected.
- Never log or store user text.