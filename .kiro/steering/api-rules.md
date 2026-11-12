---
inclusion: fileMatch
fileMatchPattern: "src/{app/api,server/api}/**"
---
# API rules
- Route handlers are thin: all logic lives in src/server/api as a handler
  factory with injected dependencies (pipeline factory, LLM client provider,
  rate limiter, LLM budget, clock). Tests use standard Request and Response.
- Validate every input with zod. Never trust headers, body size or content type.
- Error responses contain only a fixed error code. Never include internal
  messages, stack traces, user text, headers, IPs or keys.
- Never log or store user text, IPs, raw LLM responses or provider errors.
  Log only fixed events (status, duration, semantic mode).
- The handler never throws: every failure becomes a Response.
- API settings are read only in src/server/api/api-config.ts; LLM settings only
  in src/server/llm/llm-config.ts. Use relative imports, no path aliases.
- Rate limit and LLM budget numbers live in config, below the provider quota.
- Consult the Next.js 15 documentation for route handler conventions; do not
  guess config exports.