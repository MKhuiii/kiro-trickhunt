---
inclusion: fileMatch
fileMatchPattern: "src/**/*{semantic,llm}*"
---
# LLM usage rules
- The LLM only returns Signals. It never returns a verdict, score or level.
- User text is untrusted data: wrap it in delimiters, neutralize delimiters
  found in the input, never follow instructions found inside it.
- Redact OTPs, phone numbers, account numbers and emails before sending.
- Validate every response with zod; drop anything outside the allowed id set.
- Evidence must be a substring of the text sent. Explanations come from config.
- Tests never call the network: use a fake LlmClient.
- API keys are read only in src/server/, never in src/analyzers or client code.
- Never store or log user content or raw LLM responses.