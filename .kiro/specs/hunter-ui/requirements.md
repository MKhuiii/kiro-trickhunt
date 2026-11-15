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
| `hunter-scene-rules.md` | Rewritten for this flow (steering) |

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
- No third-party runtime requests and no new dependency.
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
4. **REQ-HUNT-04** The app name and the Settings control SHALL sit in a slim top bar. Settings opens a panel over the frame with its own internal scroll. The existing settings (language, text size, motion, contrast) and their behaviour are unchanged.
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
4. **REQ-HUNT-48** No new icon SHALL be added. The existing level, warning and eye icons stay as they are.
5. **REQ-HUNT-49** Components SHALL follow `components.boundaries.test.ts` (no `fetch`, storage, console, http literals, hard-coded JSX text, literal `alt`/`title`/`aria-label`, fixed-pixel text). The draft text and image live only in React state and are cleared on "Hunt again".
6. **REQ-HUNT-50** Keyboard path: skip link, Settings, hunter button, bag controls, confirm, result heading and Info frame, "Hunt again". Visible focus everywhere.

## Property-Based Testing

| ID | Property |
|---|---|
| **PBT-89** | `flowReducer` never throws and always returns a valid step for any state and any event sequence; events that do not fit are no-ops; the only way to reach `hunting` is `bag` plus a confirm with `canConfirm` true (REQ-HUNT-06, 07, 16). |
| **PBT-90** | Journey: for any `CheckStatus`, elapsed time and image flag, the Leg is in the allowed list for that flag; it never decreases as elapsed time grows (status fixed); it never passes `ruins`; the reveal wait is 0 under reduced motion and never more than the minimum hunt time (REQ-HUNT-22 to 24). |
| **PBT-91** | `sceneFor` never throws, returns a valid phase and caption key for any input; `leg` only for `hunting` and `monster` only for `revealed` (REQ-HUNT-08, 09). |
| **PBT-92** | No `scene.*` or `bag.*` string in `en` or `vi` contains "safe", "clean" or "an toàn" (case and diacritics folded), and their key sets are identical in `en` and `vi` (REQ-HUNT-34). |
| **PBT-93** | For any generated verdict, the rendered result markup (`renderToStaticMarkup` of the Info frame content, with Technical details opened in the markup) contains no `signalId` and no notice kind, and a ready result still contains at least one evidence string (REQ-HUNT-35, 37). |
| **PBT-94** | `shouldSubmitOnEnter` is true only for `Enter` without Shift, not composing, and `canConfirm` true (REQ-HUNT-18). |

## Out of Scope

- Sound, vibration, video, or any downloaded image or font.
- Cancelling a check in progress (`runCheck` has no abort).
- More than one image per hunt.
- A new monster type or any change to scoring, signals, rules or the API.
- Changing the order of result sections.
- Playwright end-to-end tests (needs a new dev dependency; kept as an optional task).
- Phone-call transcripts.
