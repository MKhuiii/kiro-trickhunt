---
inclusion: fileMatch
fileMatchPattern: "src/{client,app}/**"
---
# Client ingest rules
- Images never leave the browser. The only network call allowed is a
  same-origin POST to /api/analyze carrying text and URLs, never image data.
- Keep pure logic (classification, request building, size math, validation)
  separate from browser adapters (canvas, OCR worker, file reading).
  Adapters take their dependencies as parameters so tests can fake them.
- Load heavy libraries lazily with dynamic import inside functions, never at
  module top level. Terminate OCR workers and revoke object URLs on every path.
- Self-host OCR assets (worker, wasm, language data) under public/; do not
  depend on third-party CDNs at runtime. Check the library docs for options.
- Non-URL QR payloads (Wi-Fi, contact, payment, other) are never forwarded to
  the server. Only http and https URLs are.
- Redraw images through a canvas to drop metadata and downscale to the limit.
- No analytics, no tracking, no localStorage of user content or images.
- Client limits must equal the server limits; a test must enforce it.
- Pin exact dependency versions; report each new dependency's size, license and
  last release date. Prefer maintained libraries.
- Server code must never be imported from client code.