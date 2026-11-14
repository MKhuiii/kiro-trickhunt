---
inclusion: fileMatch
fileMatchPattern: "src/{app,ui}/**"
---
# UI rules
- Never present any result as "safe" or "an toàn". no_signals reads as "no
  warning signs found" plus a reminder to verify through official channels.
- Risk is never conveyed by color alone: always a text label and an icon too.
- Every user-visible string lives in the vi/en dictionary. No hard-coded text
  in components. Never show raw error codes, ids or JSON except inside a
  collapsed "technical details" section.
- Keep view logic pure and tested (view-model, highlighting, message mapping,
  contrast checks). Components stay thin and take dependencies as props.
- Accessibility baseline: semantic HTML, labelled controls, keyboard
  operation, visible focus, aria-live status, WCAG AA contrast, large-text
  mode, reduced-motion respected, no flashing content.
- No third-party requests at runtime (fonts, images, scripts, analytics).
  Build-time self-hosted fonts are allowed; check the Next.js docs.
- Browser storage is allowed only for UI preferences (language, text size,
  motion, contrast) in one module with a closed set of keys and values, wrapped
  in try/catch. Never store user content.
- Use only original artwork; no third-party characters or trademarks.
- Client source may import only types from src/pipeline (import type), never
  src/server. Test files may import configs to check coverage.
- Reuse the existing ingest public API and analyze client; do not duplicate
  their logic and do not change the API contract.
- English is the default and the source language of the dictionary. Vietnamese
  is secondary and must have the same keys. The UI never auto-detects the
  language; the user's saved choice overrides the default.