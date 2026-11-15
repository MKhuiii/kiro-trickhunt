---
inclusion: fileMatch
fileMatchPattern: "src/{components,ui,app}/**"
---
# Hunter scene rules

Applies to the one-frame hunter experience, the backdrops and the monster art
(spec `hunter-ui`).

## Frame and flow

- The page is one fixed frame (`h-dvh`, `overflow-hidden`). The page never
  scrolls. Only the information frame and the bag panel may scroll, inside
  themselves, and they are keyboard focusable with a label from the dictionary.
- Flow: `home` (hunter in the middle, a real button), `bag` (Text and Picture
  compartments, both can be on), `hunting` (forest, mountain, swamp, ruins),
  `revealed` (monster large in the middle plus the info frame), `lost`.
- Flow, journey and scene logic is pure and tested in `src/ui/view/`.
  Components stay thin.
- Enter confirms in the text field, Shift+Enter makes a new line, and Enter
  never confirms during IME composition. Esc closes the bag.
- The journey shows for at least 4 seconds (one constant). Skip the wait when
  reduced motion is on. Never delay the check itself.
- The scene never replaces result content. The level, "What to do now", the
  evidence and the limits note keep their order (`resultSections`). The limits
  note is pinned at the foot of the info frame.

## Art

- All art is original. The first version is hand-written inline SVG. Every
  piece is reached through the art registry so it can later be swapped for an
  original image file in `public/hunter/` (same origin, decorative `alt=""`,
  within the size budget) without touching components or logic.
- Detail standard: large `viewBox` (200x200 monsters, 800x500 scenes); 4 to 6
  shades from color tokens; gradients for depth; shading and rim light; fine
  details; separate `<g data-part="...">` groups per body part or layer. Fine
  details live in groups whose `data-part` ends with `-detail` and are hidden in
  high contrast.
- Size budget: each art file at most 30 KB, all art at most 350 KB. A test
  enforces it.
- Scene SVGs are decorative: `aria-hidden="true"`, `focusable="false"`, and no
  `<text>`, `<title>`, `<filter>` or `<animate>`. Every meaning is also visible
  text from the dictionary.
- Build one piece at a time and show it to the user before the next piece.

## Content and wording

- Do not add new icons. The existing level icon and the warning and eye icons
  stay. Decoration comes from the scene illustrations.
- Never show internal ids to the user: signal ids, notice kinds, art ids,
  monster ids, level keys. Use dictionary text. Ids may stay in view models for
  React keys and tests.
- Captions never call a result "safe", "clean" or "an toàn". A result with no
  signals says "no warning signs found" and reminds the user to verify through
  official channels.
- Every user-visible string, including captions and accessible names, is a
  dictionary key in `en` and `vi` with identical key sets.

## Motion, color and size

- Animate only `transform` and `opacity`. Slow loops, no flashing (at most 3
  flashes per second), no SVG filters or blur.
- The base (non-animated) style of an element is its final, readable state.
  Keyframes describe only the start. With motion off, every step and leg must
  stay distinguishable by shape or text, not by color alone.
- Text never sits directly on busy art. Put it on a `surface` or `parchment`
  panel. New color tokens go in both palettes; text pairs go in the declared
  contrast pairs.
- Use relative units (`rem`, `%`, `dvh`, `clamp`). Controls are at least 2.75
  rem high. No fixed-pixel font sizes. Works from 320 px, in portrait and
  landscape, at the largest text size.

## Privacy

- Draft text and image live only in React state and are cleared on "Hunt
  again". Nothing is stored, no analytics, no third-party requests, no new
  dependency.
