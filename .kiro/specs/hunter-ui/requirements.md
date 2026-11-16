# Requirements Document

## Introduction

A spooky, Halloween "monster hunt" experience for TrickHunt that fits in one
fixed frame (no page scroll). The hunter stands in the middle of the screen.
The user taps the hunter to open his bag, puts a written message and/or a
picture into the bag, and confirms (Enter works). The hunter then travels
through a forest, mountains and a swamp to the ruins. When the monster is found,
it fills the screen and an information frame shows its name, description,
what to do next and the other data the pipeline returns.

It builds on the finished `ui-presentation` and `ui-page` specs. It replaces the
layout and the input form of the page. It does not change how a result is
computed, and it does not change the order of the result sections.

Numbering: new `REQ-HUNT-` series and `PBT-89` onward (last existing is
`PBT-88`; `REQ-PAGE-` and `REQ-UI-` are left alone).

## Relationship to existing specs

`ui-presentation` and `ui-page` are complete and are not reopened. This spec
amends them as follows and leaves everything else as is:

| Existing item | Change made by this spec |
|---|---|
| Page layout of `App.tsx` (scrolling column) | Replaced by one fixed frame. The page never scrolls; only the information frame scrolls inside itself |
| `InputForm.tsx` | Replaced by `HunterButton` and `BagPanel`. The image helpers (`firstImage`, drag and drop, paste) are kept |
| `input.submit` (en/vi) | Reads "Start the hunt" / "Bắt đầu săn" (tests that pinned the old text are updated) |
| `MonsterCard` | Drops its small art. The monster is shown large in the scene |
| `TechnicalDetails` | No longer prints signal ids or notice kinds |
| `monster-art.tsx` | Same `artKey`s, new detailed drawings, reached through an art registry |
| `LimitsNote` | Pinned at the foot of the information frame so it stays visible (REQ-PAGE-23) |
| `hunter-scene-rules.md` | Rewritten for this flow (steering); amended again for the Pixi and journal revision |
| `InfoFrame` (revision 2) | Replaced by `JournalSheet`: one paper object with two pages. `resultSections` order is kept; the split into pages is a new pure function |
| `BagPanel` look (revision 2) | Redrawn without boxes (pockets, ruled paper, photo, wax seal). Its behaviour and props contract do not change |
| Out of scope "sound" (revision 2) | Optional ambient sound, off by default, generated with Web Audio (no files) |

`resultSections` and the order of the sections are **not** changed. The
information frame renders them in the same order; only `limitsNote` is pinned
to the foot instead of scrolling. A `suspicious` result still reads calm: the
level, the "What to do now" box and the evidence stay the primary content
(REQ-PAGE-04, REQ-PAGE-14).

**Hard constraints** (unchanged from `ui-rules.md`, `privacy-and-safety.md`,
`client-ingest-rules.md`):

- No change to `src/core`, `src/analyzers`, `src/pipeline`, `src/server`,
  `src/app/api`, `src/client` or the `POST /api/analyze` contract. `runCheck`
  is reused as is (it already accepts one text and one image together).
- No result is ever called "safe" / "an toàn" / "clean".
- Risk is never conveyed by color alone: the text label and the existing level
  icon stay.
- Every user-visible string is a dictionary key in `en` and `vi` with identical
  key sets. No hard-coded text in components or inside SVG. English is default.
- Images never leave the browser; only text and http(s) URLs reach the server.
  Nothing the user submits is stored. No analytics.
- No third-party runtime requests. The only new dependency allowed by this spec
  is `pixi.js`, pinned to an exact version (Requirement 10).
- Reduced motion, no flashing, large-text mode and high contrast keep working.

## Glossary

- **Frame**: The one fixed-size screen (`100dvh`, no page scroll) that holds everything.
- **Flow step**: One of `home`, `bag`, `hunting`, `revealed`, `lost`.
- **Bag**: The panel opened by tapping the hunter. It has two compartments, Text and Picture.
- **Compartment**: One of the two inputs in the bag. Each can be switched on or off.
- **Leg**: One part of the hunting journey: `forest`, `mountain`, `swamp`, `ruins`.
- **Shade**: The dark silhouette the hunter chases. It turns into the monster at the reveal.
- **Info frame**: The framed area that shows the result data and scrolls inside itself.
- **Art registry**: The one table that maps an art id to an inline SVG component or to an image file.
- **Minimum hunt time**: The shortest time the journey is shown before the reveal (4 seconds).

## Requirements

### Requirement 1: One fixed frame

**User Story:** As a user, I want the app to fit one screen without scrolling, so that it feels like a game and not a form.

1. **REQ-HUNT-01** THE page SHALL fill the viewport (`100dvh`, `overflow: hidden` on the page) in every flow step, with no page scroll at any width from 320 px up.
2. **REQ-HUNT-02** Only the Info frame MAY scroll, and only inside itself. It SHALL be keyboard focusable (`tabindex="0"`), have an accessible name from the dictionary and a visible focus ring, so a keyboard user can scroll it.
3. **REQ-HUNT-03** At large text sizes and on small screens, no content SHALL be cut off: whatever does not fit is reachable by scrolling inside the Info frame or the bag panel.
4. **REQ-HUNT-04** (Revision 3) There SHALL be no header bar. Three round buttons float in the top-right corner: the language (shown as the flag of the current language, one press switches between English and Vietnamese), the ambient sound (a speaker icon, on or off, `aria-pressed`) and the settings (a gear icon that opens a panel over the frame with its own internal scroll). Each button SHALL have a text name from the dictionary. The existing settings (language, text size, motion, contrast, sound) and their behaviour are unchanged. The "TrickHunt" logo SHALL sit above the hunter on the home screen in a Halloween display font, and be a screen-reader-only heading on the other steps.
5. **REQ-HUNT-05** The privacy note SHALL be visible at `home` and in the bag.

### Requirement 2: Flow and scene model

1. **REQ-HUNT-06** `flowReducer(state, event)` SHALL be a pure, total function in `src/ui/view/flow.ts`: it never throws, ignores events that do not fit the current step, and returns the same state for them.
2. **REQ-HUNT-07** The steps and transitions SHALL be: `home` to `bag` (open bag); `bag` to `home` (close bag); `bag` to `hunting` (confirm, only when it can be confirmed); `hunting` to `revealed` (result), to `lost` (failure or no usable result); `revealed` and `lost` to `home` (hunt again).
3. **REQ-HUNT-08** `sceneFor(input)` SHALL be a pure, total function in `src/ui/view/scene.ts` returning `{ phase, leg, captionKey, monster }`; it never throws, for any input including malformed values. The phase equals the flow step. `leg` is non-null only for `hunting`. `monster` is non-null only for `revealed`.
4. **REQ-HUNT-09** Every `captionKey` SHALL be present in both dictionaries.
5. **REQ-HUNT-10** WHEN a result is withheld (no usable verdict), THE step SHALL be `lost`.

### Requirement 3: The hunter at home

1. **REQ-HUNT-11** At `home`, THE hunter SHALL stand in the middle of the frame over the graveyard backdrop, with a caption inviting the user to tap the hunter.
2. **REQ-HUNT-12** The hunter SHALL be a real `<button>` (Tab, Enter and Space work) with an accessible name from the dictionary and a visible focus ring. Tapping it opens the bag.
3. **REQ-HUNT-13** The tap target SHALL be the whole hunter figure and at least 2.75 rem by 2.75 rem.

### Requirement 4: The bag

1. **REQ-HUNT-14** The bag SHALL offer two compartments, "Written message" and "Picture". Each is a toggle button with a text label. Switching one on reveals its input; switching it off hides the input and excludes that input from the check.
2. **REQ-HUNT-15** The Text compartment SHALL hold the same text field as today (same label, hint, no length change). The Picture compartment SHALL keep the existing image rules: choose a file, drag and drop, paste anywhere, remove, and accept PNG, JPEG and WebP.
3. **REQ-HUNT-16** The bag SHALL be confirmed only when at least one switched-on compartment has content (trimmed text not empty, or an image chosen). `canConfirm` SHALL be a pure function. Otherwise the confirm button is disabled and a hint says to put something in the bag.
4. **REQ-HUNT-17** The confirm button SHALL read "Start the hunt" / "Bắt đầu săn". Confirming calls `runCheck` with the text only if the Text compartment is on and the file only if the Picture compartment is on.
5. **REQ-HUNT-18** In the text field, Enter SHALL confirm (when `canConfirm`) and Shift+Enter SHALL insert a new line. Enter SHALL NOT confirm while an IME composition is in progress (Vietnamese Telex and VNI typing). `shouldSubmitOnEnter` SHALL be a pure function.
6. **REQ-HUNT-19** Esc SHALL close the bag and return focus to the hunter button. There is also a visible "Close the bag" button.
7. **REQ-HUNT-20** Opening the bag SHALL move focus to the bag heading. The bag is a labelled region, not a blocking modal.

### Requirement 5: The hunt

1. **REQ-HUNT-21** WHILE `hunting`, THE scene SHALL show the hunter travelling through a sequence of Legs, each with its own backdrop, and the Shade ahead of him.
2. **REQ-HUNT-22** With a picture in the check, THE Legs SHALL be `forest`, `mountain`, `swamp`, `ruins`. With text only, THE Legs SHALL be `forest` and `ruins`.
3. **REQ-HUNT-23** The current Leg SHALL be the later of the Leg given by the real `CheckStatus` (`preparing` to `forest`; `qr` to `mountain`; `ocr-loading` and `ocr-recognizing` to `swamp`; `sending` to `ruins`) and the Leg given by elapsed time (the minimum hunt time divided equally among the Legs). It SHALL never move backward and never go past `ruins`.
4. **REQ-HUNT-24** The minimum hunt time SHALL be 4 seconds, one constant in `src/ui/hunt.config.ts`. The reveal SHALL happen only when the result is ready AND the minimum hunt time has passed. A slow check keeps the hunter at `ruins`. The wait SHALL NOT be added when reduced motion is on (system or in-page setting).
5. **REQ-HUNT-25** The caption SHALL change with the Leg, using dictionary keys. The existing `StatusRegion` stays the only `aria-live` region and keeps announcing the exact progress (including the OCR percent). The caption is not a live region.
6. **REQ-HUNT-26** Animation SHALL use only `transform` and `opacity`, loop slowly, and never flash more than 3 times in any second.
7. **REQ-HUNT-27** The base (non-animated) style of every scene element SHALL be its final, readable state. Keyframes describe only the start. With motion off every Leg SHALL still be distinguishable by its backdrop shape and caption, not by color alone.

### Requirement 6: Reveal and information

1. **REQ-HUNT-28** WHEN `revealed`, THE specific monster SHALL fill the middle of the frame as a large illustration (not next to the hunter), in its monster color token, with the caption "The shadow was a {name}" or, for `neutral`, "no warning signs found, still check through official channels".
2. **REQ-HUNT-29** The Info frame SHALL show the existing sections in the existing order (`resultSections`): heading, level banner, AI note, "What to do now", evidence and highlighted message, limitations, the monster card (name, description and tips), notices and technical details. Evidence SHALL always accompany the level.
3. **REQ-HUNT-30** The `limitsNote` SHALL be pinned at the foot of the Info frame and always visible; the other sections scroll above it. A pure function SHALL split `resultSections` into scrolling and pinned parts.
4. **REQ-HUNT-31** On wide screens the monster and the Info frame SHALL sit side by side. On narrow screens the monster SHALL sit above and the Info frame below, taking the rest of the frame height.
5. **REQ-HUNT-32** After a result is ready, focus SHALL move to the result heading in the Info frame. A visible "Hunt again" button returns to `home` and clears the draft text and image from memory.
6. **REQ-HUNT-33** WHEN `lost`, THE scene SHALL show the hunter with a "trail went cold" caption, with the existing `ErrorAlert` or withheld notice carrying the reason, and a "Hunt again" button.
7. **REQ-HUNT-34** Captions SHALL never use "safe", "clean" or "an toàn".

### Requirement 7: No ids in the UI

1. **REQ-HUNT-35** No `signalId`, notice `kind`, art id, monster id, level key or other internal code SHALL appear in rendered text, visible attributes or accessible names anywhere on the page, including inside "Technical details".
2. **REQ-HUNT-36** `TechnicalDetails` SHALL show only dictionary text (the semantic note) and stay collapsed by default. It renders nothing when it has nothing to show.
3. **REQ-HUNT-37** `signalId` MAY stay in the view model for keys and tests but SHALL not be rendered.

### Requirement 8: Detailed illustrations

1. **REQ-HUNT-38** All art SHALL be original. The first version is hand-written inline SVG. Every piece SHALL be reachable through the art registry, so a piece can later be swapped for an original image file in `public/hunter/` without changing any component or logic.
2. **REQ-HUNT-39** Detail standard for each piece: a large `viewBox` (200x200 for monsters, 800x500 for scenes); filled shapes in 4 to 6 shades taken from color tokens (base, dark, light, accent, glowing eyes); gradients for depth; shading shapes and a rim light; fine details (cloth folds, tears, stitches, cracks, glints); and separate `<g data-part="...">` groups for each body part or layer so parts can be animated.
3. **REQ-HUNT-40** The pieces SHALL be: five backdrops (graveyard home, forest, mountain, swamp, ruins), each in 3 to 4 depth layers with fog and a few living details (bats, crows, fireflies, gravestones); the hunter in six poses (idle, tracking, lantern raised, reading, aiming, downcast), each differing in shape; the bag (closed and open) with a paper and a photo frame; the Shade in 2 to 3 running poses; and six monsters: Bank Ghost, Prize Vampire, Job Zombie, Authority Banshee, Generic Shade and the Neutral Candle.
4. **REQ-HUNT-41** Size budget: each art file at most 30 KB of source and all art together at most 350 KB. A test SHALL enforce it.
5. **REQ-HUNT-42** No SVG filter and no blur on any scene element, no `<animate>` elements, no `<text>` and no `<title>`. Every scene SVG SHALL be `aria-hidden="true"` and `focusable="false"`. A test SHALL enforce it.
6. **REQ-HUNT-43** In high contrast, THE fine-detail layers (`data-part` ending in `-detail`) SHALL be hidden and the shapes SHALL use the high contrast palette.
7. **REQ-HUNT-44** If an image file is later used for a piece, it SHALL be a same-origin file in `public/hunter/`, decorative (`alt=""`), original, lazy where possible, and within the size budget.

### Requirement 9: Responsive, accessible and private

1. **REQ-HUNT-45** The Frame SHALL work in portrait and landscape from 320 px wide to wide desktops, at text size 100% to the largest preference. In landscape on small phones the layout SHALL use two columns.
2. **REQ-HUNT-46** All sizes of user-facing text and boxes SHALL use relative units (`rem`, `%`, `dvh`, `clamp`). No fixed-pixel font sizes. Buttons and toggles SHALL be at least 2.75 rem high.
3. **REQ-HUNT-47** New palette tokens SHALL be defined in `NORMAL_PALETTE` and `HIGH_CONTRAST_PALETTE`; every text pair SHALL be declared and pass the existing thresholds. Text SHALL sit on `surface` or `parchment` panels, never directly on art.
4. **REQ-HUNT-48** No new icon SHALL be added, except the flags, the speaker and the gear of the three top-right buttons (REQ-HUNT-04, requested by the maintainer). The existing level, warning and eye icons stay as they are.
5. **REQ-HUNT-49** Components SHALL follow `components.boundaries.test.ts` (no `fetch`, storage, console, http literals, hard-coded JSX text, literal `alt`/`title`/`aria-label`, fixed-pixel text). The draft text and image live only in React state and are cleared on "Hunt again".
6. **REQ-HUNT-50** Keyboard path: skip link, Settings, hunter button, bag controls, confirm, result heading and Info frame, "Hunt again". Visible focus everywhere.

### Requirement 10: PixiJS stage (revision 2)

**User Story:** As a user, I want the scene to feel like a game, so that the hunt is alive and not a flat picture.

1. **REQ-HUNT-51** The only new runtime dependency SHALL be `pixi.js`, pinned to an exact version (8.23.0). `@pixi/react` and any other new runtime dependency SHALL NOT be added. Its size (gzip, as bundled), licence (MIT) and release date SHALL be recorded in `design.md`.
2. **REQ-HUNT-52** `pixi.js` SHALL be loaded only through a dynamic `import()` inside a function, after the first screen is shown. No other file SHALL import it at module top level. The first screen SHALL render from the existing SVG art and Pixi SHALL take over the atmosphere layer when it has loaded (progressive enhancement).
3. **REQ-HUNT-53** The canvas SHALL be decorative: `aria-hidden="true"`, not focusable, `pointer-events: none`. Every piece of text and every control SHALL stay a DOM element above or beside the canvas.
4. **REQ-HUNT-54** The page SHALL keep the existing SVG scene and show no error when: WebGL is not available, creating the stage fails or loses its context, or the device profile is `off`. With reduced motion (system or in-page) the stage draws only still layers (REQ-HUNT-63) and starts no ticker.
5. **REQ-HUNT-55** The stage SHALL make no network request. Textures come from memory or same-origin blob URLs created from the existing SVG art; blob URLs SHALL be revoked and the application, its textures and its ticker SHALL be destroyed when the stage unmounts or the page hides.
6. **REQ-HUNT-56** No Pixi filter (blur, glow, displacement) SHALL be used. Light SHALL be drawn with pre-built radial gradient textures in additive blend. No brightness change SHALL cross more than 3 times in any second; lantern flicker SHALL be at most 1.5 Hz and smooth; vignette pulse SHALL be at most 0.5 Hz.
7. **REQ-HUNT-57** `stagePlan(scene, prefs, profile)` SHALL be a pure, total function in `src/ui/view/stage-plan.ts`. It returns the layers, particle recipes, light and intensities for the current scene. It never throws. Particle counts SHALL be capped by the profile (`off`, `low`, `normal`). The Pixi adapter SHALL take its dependencies (the `pixi.js` module, the plan, the container) as parameters so it can be tested with fakes.
8. **REQ-HUNT-58** The adapter SHALL pause its ticker while the tab is hidden and SHALL resize with its container (resolution capped at 2, no antialias on small screens).

### Requirement 11: A scarier atmosphere (revision 2)

1. **REQ-HUNT-59** The scenes SHALL be darker (near-black violet), with a vignette closing in on the edges and a small dark-red accent token. All new color tokens SHALL be defined in both palettes; text pairs SHALL be declared and pass the existing thresholds; text SHALL never sit directly on busy art.
2. **REQ-HUNT-60** The stage SHALL draw at least three depth layers of drifting fog, fireflies, bats and crows crossing at long intervals, eyes in the dark that fade in and out slowly, swaying dead trees, and a warm light pool around the hunter's lantern.
3. **REQ-HUNT-61** WHILE `hunting`, THE vignette SHALL breathe slowly like a heartbeat (at most 0.5 Hz). The hunt legs SHALL move as parallax layers, the hunter SHALL step and the Shade SHALL run ahead. Moving between legs SHALL pass through darkness.
4. **REQ-HUNT-62** The reveal SHALL close the darkness, sweep the lantern light across the scene and fade the monster in out of the Shade, then let it breathe. It SHALL NOT use flashes. Camera motion SHALL be at most 2% and slow.
5. **REQ-HUNT-63** With reduced motion every layer SHALL be still: the vignette and the light pool remain, nothing drifts, pulses or crosses, and the hunter and monster use their still poses. Layout and content SHALL be identical.
6. **REQ-HUNT-64** (Done in task 22.) While hunting, the hunter and the shade are painted in the canvas, and at the reveal the monster is painted in the canvas, from the page's own SVG drawings (marked `data-actor`). The SVG copy stays in the page for layout and as the fallback, and is hidden (`data-canvas-actor="on"`, opacity 0) only after the canvas copy exists. It is shown again when the stage is closed, loses its context, or the step changes. The home and bag steps keep the SVG hunter. The monster steps out of the shade (dark and faint, then its colors) and breathes; the hunter bobs and the shade runs; with reduced motion all of them are still and fully shown. Pictures are made from same-origin `blob:` addresses that are revoked at once; the art is checked to be plain (no script, no image, no external link).

### Requirement 12: The hunter's journal (revision 2)

**User Story:** As a user, I want a short note of what the hunter found, so that I know what to do without reading many boxes.

1. **REQ-HUNT-65** After the reveal, THE result SHALL be shown on one paper object (`JournalSheet`) with two pages. There SHALL be no card, tile or bordered box inside the paper. At most one framed object SHALL be on any screen.
2. **REQ-HUNT-66** `buildJournalView(view)` SHALL be a pure, total function in `src/ui/view/journal.ts`. For a ready result, page 1 SHALL contain: the monster name and one short sentence; the level label (text, meter and the existing level icon); the primary action and at most two more actions (at most 3); at most 3 clues chosen by severity from high to low (stable order when equal); one line for the most important note (AI note when the AI check did not run, else a QR payment or Wi-Fi notice) with "N more notes on the next page" when there are others; and the limits note on one line.
3. **REQ-HUNT-67** Page 1 SHALL contain at least one evidence clue whenever the level is not `no_signals`, and SHALL always contain the limits note. For `no_signals` page 1 SHALL contain the "no warning signs found" text and the reminder to verify through official channels, never the words "safe", "clean" or "an toàn". A withheld result SHALL show the withheld message and the limits note on page 1.
4. **REQ-HUNT-68** Page 2 SHALL contain everything else from `resultSections`, in the same order: all clues grouped by source, the highlighted message, the monster's tips, limitations, all notices, the AI note and the collapsed technical details. Page 1 and page 2 together SHALL hold every section of `resultSections` (nothing is lost). Page 2 scrolls inside the paper with `tabindex="0"` and a dictionary label.
5. **REQ-HUNT-69** The paper SHALL be aged light paper with dark ink (contrast AA or better). Handwriting fonts, self-hosted at build time, SHALL be used for headings only and SHALL cover Vietnamese; body text SHALL be a plain readable font. In high contrast the paper SHALL be white with black ink and no stains or texture.
6. **REQ-HUNT-70** The page turn SHALL use only `transform` and `opacity`. Text MAY appear as if being written, but all text SHALL be in the DOM from the start and reduced motion SHALL show it at once. "Hunt again" SHALL be a plain ink-style text button. Focus goes to the journal heading when the result is ready.
7. **REQ-HUNT-71** No internal id SHALL appear in the journal (REQ-HUNT-35 still applies).

### Requirement 13: The bag without boxes (revision 2)

1. **REQ-HUNT-72** The bag SHALL show two cloth pockets in the scene (Text and Picture), a ruled paper for the message (the text field has no border box) and a photo frame for the picture. The confirm control SHALL be a wax seal with the text "Start the hunt". The behaviour of `BagPanel` SHALL NOT change: toggles, Enter, Shift+Enter, IME safety, Esc, focus on the heading, drag and drop, paste, remove, the `canConfirm` rule and its props.
2. **REQ-HUNT-73** All bag controls SHALL stay real labelled form controls, at least 2.75 rem high, with visible focus.

### Requirement 14: Optional ambient sound (revision 2)

1. **REQ-HUNT-74** A `sound` preference SHALL be added to `src/ui/preferences.ts` (closed key set, default `false`, try/catch, a wrong stored value gives the default). Settings SHALL show a text-labelled switch for it. With sound off, no audio object SHALL be created.
2. **REQ-HUNT-75** `soundPlan(scene, prefs)` SHALL be a pure, total function in `src/ui/view/sound-plan.ts` that returns the cues for the scene: wind for every step, a heartbeat while `hunting`, a creak when the bag opens, a low swell at the reveal. Every cue SHALL have a gain of at most 0.2 and a fade of at least 0.5 s. With sound off it returns no cues. The generated sounds SHALL be audible on a phone or laptop speaker: sources are normalized before the cue gain, notes sit above 100 Hz, and the loudness measured offline with the real host is about -27 to -22 dBFS RMS.
3. **REQ-HUNT-76** The audio adapter SHALL create its `AudioContext` only after a user gesture, take the context factory as a parameter, build all sounds from noise and oscillators (no files, no network), suspend when the tab is hidden and close on unmount. A sound SHALL never be the only carrier of information.

## Property-Based Testing

| ID | Property |
|---|---|
| **PBT-95** | `stagePlan` never throws and returns a valid plan for any scene, preferences and profile. With reduced motion it has no moving layer. Particle counts never exceed the profile cap. Flicker and pulse frequencies never exceed the limits in REQ-HUNT-56 (REQ-HUNT-56, 57, 63). |
| **PBT-96** | For any generated verdict, `buildJournalView` page 1 has at most 3 clues and 3 actions, is sorted by severity, has the limits note, has at least one clue when the level is not `no_signals`, keeps the AI note line when the AI did not run, and contains no internal id. Page 1 plus page 2 hold every section of `resultSections` (REQ-HUNT-66 to 68, 71). |
| **PBT-97** | `soundPlan` returns no cue when sound is off; every cue has gain at most 0.2 and fade at least 0.5 s; never throws for malformed input (REQ-HUNT-75). |
| **PBT-98** | A wrong or missing stored `sound` value always loads as `false`; saving then loading returns the saved value (REQ-HUNT-74). |
| **PBT-99** | The English and Vietnamese dictionaries have identical key sets for all `journal.*`, `sound.*` and `settings.sound.*` keys, and no such string contains "safe", "clean" or "an toàn" (REQ-HUNT-67, 74). |

| **PBT-89** | `flowReducer` never throws and always returns a valid step for any state and any event sequence; events that do not fit are no-ops; the only way to reach `hunting` is `bag` plus a confirm with `canConfirm` true (REQ-HUNT-06, 07, 16). |
| **PBT-90** | Journey: for any `CheckStatus`, elapsed time and image flag, the Leg is in the allowed list for that flag; it never decreases as elapsed time grows (status fixed); it never passes `ruins`; the reveal wait is 0 under reduced motion and never more than the minimum hunt time (REQ-HUNT-22 to 24). |
| **PBT-91** | `sceneFor` never throws, returns a valid phase and caption key for any input; `leg` only for `hunting` and `monster` only for `revealed` (REQ-HUNT-08, 09). |
| **PBT-92** | No `scene.*` or `bag.*` string in `en` or `vi` contains "safe", "clean" or "an toàn" (case and diacritics folded), and their key sets are identical in `en` and `vi` (REQ-HUNT-34). |
| **PBT-93** | For any generated verdict, the rendered result markup (`renderToStaticMarkup` of the Info frame content, with Technical details opened in the markup) contains no `signalId` and no notice kind, and a ready result still contains at least one evidence string (REQ-HUNT-35, 37). |
| **PBT-94** | `shouldSubmitOnEnter` is true only for `Enter` without Shift, not composing, and `canConfirm` true (REQ-HUNT-18). |

## Out of Scope

- Sound files, vibration, video, or any downloaded image or font (generated
  ambient sound is in scope, REQ-HUNT-74 to 76; fonts are self-hosted at build time).
- Cancelling a check in progress (`runCheck` has no abort).
- More than one image per hunt.
- A new monster type or any change to scoring, signals, rules or the API.
- Changing the order of result sections.
- Phone-call transcripts.
