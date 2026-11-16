---
inclusion: fileMatch
fileMatchPattern: "src/{components,ui,app}/**"
---
# Hunter scene rules

The words in this experience follow `halloween-voice.md` (three tiers: full horror,
meaning first, plain only). Wording is never decided inside a component.

Applies to the one-frame hunter experience, the backdrops and the monster art
(spec `hunter-ui`).

## Frame and flow

- The page is one fixed frame (`h-dvh`, `overflow-hidden`). The page never
  scrolls. Only the journal's second page and the bag may scroll, inside
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
  note is always visible (pinned at the foot of the journal paper).

## Stage (PixiJS), journal and sound (revision 2)

- The only extra runtime dependency is `pixi.js`, pinned to an exact version.
  Do not add `@pixi/react` or any other runtime dependency without asking.
- Load `pixi.js` only with `import()` inside a function, after the first screen
  is shown. No top-level `pixi.js` import outside `src/components/stage/`.
- The first screen always renders from the SVG art. Pixi adds the atmosphere
  (and later the hunter and monsters) on top. If WebGL fails, the profile is
  `off`, or reduced motion is on, keep the SVG scene and show no error.
- The canvas is decorative: `aria-hidden`, not focusable, no pointer events.
  Text and controls stay DOM. No network request: textures come from memory or
  same-origin blob URLs. Revoke them and destroy the application on unmount.
- No Pixi filters. Draw light with pre-built radial gradient textures in
  additive blend. Lantern flicker at most 1.5 Hz, vignette pulse at most 0.5 Hz,
  no lightning or flashes, camera motion at most 2%.
- The hunter, the shade and the monster are painted by the stage from the page's
  own SVG drawings: mark the static wrapper with `data-actor` (`hunter`, `shade`
  or `monster`) and `data-actor-key` (the pose or monster id), keep the SVG inside
  it, and never animate that wrapper (the stage animates the canvas copy). The
  SVG is hidden only after the canvas copy exists (`data-canvas-actor="on"`).
  Art that goes through the stage must be plain: no script, style, image or
  external link, and every color a `var(--th-...)` token that exists in the
  palettes (a test checks every drawing). Pictures use `blob:` addresses that are
  revoked at once.
- What the stage shows is decided by the pure `stagePlan`. The adapter takes the
  `pixi.js` module and the plan as parameters so tests can use fakes.
- Result is one paper object (the journal) with two pages. No cards or
  bordered boxes inside it, at most one framed object per screen. Page 1 holds
  at most 3 clues, 3 actions, one note line and the limits note; page 2 holds
  the rest. Light aged paper with dark ink; handwriting font for headings only.
- The bag has no form box: pockets, ruled paper, photo frame, wax seal. Its
  behaviour and props do not change.
- Sound is optional and off by default. Generate it with Web Audio (no files,
  no network). Create the `AudioContext` only after a user gesture. Gain at most
  0.2, fades at least 0.5 s, suspend when the tab is hidden. Sound never carries
  information alone.

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

- Do not add new icons, with one exception the user asked for: the three round
  buttons in the top-right corner (language flag, speaker, gear). The existing
  level icon and the warning and eye icons stay. Decoration comes from the scene
  illustrations. Every icon button has a text name from the dictionary.
- There is no header bar. The "TrickHunt" logo (Creepster font, Latin only) sits
  above the hunter on the home screen and is a screen-reader-only `h1` on the
  other steps. The three round buttons float in the top-right corner (`z-20`),
  and content keeps `3.75rem` of space at the top so nothing sits under them.
- Fonts are self-hosted from `public/fonts/` (OFL): Grenze Gotisch (700, with a
  Vietnamese subset) for headings and buttons, Creepster for the logo only. Body
  text stays a plain readable font.
- Never show internal ids to the user: signal ids, notice kinds, art ids,
  monster ids, level keys. Use dictionary text. Ids may stay in view models for
  React keys and tests.
- Captions never call a result "safe", "clean" or "an toàn". A result with no
  signals says "no warning signs found" and reminds the user to verify through
  official channels.
- Every user-visible string, including captions and accessible names, is a
  dictionary key in `en` and `vi` with identical key sets.

## Motion, color and size

- Animate only `transform` and `opacity` in DOM and SVG. Slow loops, no
  flashing (at most 3 flashes per second), no SVG filters or blur.
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
  again". Nothing is stored, no analytics, no third-party requests. The only UI
  preference storage is the existing preferences module (now also `sound`).
