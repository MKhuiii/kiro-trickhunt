# Design Document

## Overview

Two layers:

1. **Pure additions in `src/ui/`** (tested in the `node` environment): new
   dictionary keys, level and monster rule changes, view-model fields
   `aiNote` and `limitsNoteKey`, `runCheck`, `paletteToCssVars`,
   `page-layout.ts` (the ordered list of result sections).
2. **Thin React components** in `src/components/` and `src/app/page.tsx`. They
   hold state, call the pure functions and render keys through `t`. No React
   Testing Library or jsdom is added (no new dependency). Structure is tested
   through the pure `page-layout.ts` and by source scans; real browser checks
   are manual now and Playwright later.

Nothing in `src/core`, `src/analyzers`, `src/pipeline`, `src/server`,
`src/app/api` or the API contract changes.

Verified against the repository before writing:

- `src/client/ingest/index.ts` exports `ingestImage`, `buildAnalyzeRequest`,
  `analyzeRequest`, `createBrowserIngestDeps` and the types `IngestResult`,
  `OcrProgress`, `AnalyzeClientResult`, `SemanticMode`, `BuildNotice`.
- `src/app/try/page.tsx` shows the working flow (document-level paste, drop,
  file input, `ingestImage` with `onProgress`, `buildAnalyzeRequest({ userText,
  ocrText, qrResults })`, `analyzeRequest(request)`). The real page reuses that
  sequence through `runCheck`; the try page stays as is.
- `src/app/page.tsx` is still the create-next-app template and is replaced.
- `ReadyResultView`, `WithheldResultView`, `LEVEL_PRESENTATION`,
  `semanticNoteKey` and the dictionary are as described in
  `ui-presentation/design.md`.
- To confirm while implementing task 1.1: whether `BuildAnalyzeInput` already
  has a `locale` field (the `ui-presentation` design says the real UI passes
  it). If it does not, send nothing and report it; do not change the API.

## Part A: amendments in `src/ui/`

### A1. Dictionary changes

`en` first, `vi` draft (pending human review; tests do not pin `vi` wording).

| Key | en (primary) | vi (draft, pending human review) |
|---|---|---|
| `level.suspicious` *(changed)* | A few things to double-check | Có vài điều cần kiểm tra lại |
| `result.actions.heading` *(changed)* | What to do now | Bạn nên làm ngay |
| `result.aiNote.unavailable` *(new)* | The extra AI check was not available, so this result may miss newer or unusual scams. Treat unexpected requests with care. | Bước kiểm tra AI bổ sung không khả dụng, nên kết quả này có thể bỏ sót các kiểu lừa đảo mới hoặc hiếm gặp. Hãy thận trọng với mọi yêu cầu bất ngờ. |
| `result.noSignals.reminderStrong` *(new)* | Nothing was found, but the extra AI check did not run, so this result is weaker. Do not rely on it alone. If a message asks for money, a code or personal details, call the official number yourself. | Chưa thấy dấu hiệu nào, nhưng bước kiểm tra AI bổ sung không chạy nên kết quả này yếu hơn. Đừng chỉ dựa vào nó. Nếu tin nhắn đòi tiền, mã xác nhận hoặc thông tin cá nhân, hãy tự gọi số điện thoại chính thức. |
| `result.limitsNote` *(new)* | TrickHunt looks for warning signs. It cannot prove that a message is genuine. | TrickHunt tìm các dấu hiệu cảnh báo. Công cụ không thể chứng minh một tin nhắn là thật. |
| `result.aiNote.heading` *(new)* | Extra check not available | Bước kiểm tra bổ sung không khả dụng |
| `result.monster.heading` *(new)* | The kind of trick this looks like | Kiểu chiêu trò mà tin nhắn này giống |
| `result.evidence.heading` *(new)* | What we found | Chúng tôi thấy gì |
| `settings.open` *(new)* | Settings | Tùy chỉnh |
| `input.paste.hint` *(new)* | Tip: you can paste a screenshot with Ctrl+V. | Mẹo: bạn có thể dán ảnh chụp màn hình bằng Ctrl+V. |

Tests that pinned the old `level.suspicious` or `result.actions.heading` text
are updated in the same task. No new key contains "safe" or "an toàn". The
steering file `privacy-and-safety.md` row for `suspicious` is edited to match
(see tasks).

New placeholders: none. Sentence length at most 25 words (checked: the longest
is the strong reminder sentence 3, 17 words).

### A2. Level and monster rules

`LEVEL_PRESENTATION` keeps its shape. Changes:

- `suspicious`: `iconKey` stays `icon-eye` (a watching eye, not a stop sign),
  `colorToken` stays `level-suspicious` (`#FFD166` normal, `#FFE680` high
  contrast: both yellow, hue about 41° to 49°). A test converts the hex to hue
  and rejects 340° to 20°, so a future palette edit cannot make it red.
- `icon-stop` stays on `critical` only; a test enforces it.

`monsterFor(level, verdictMonster)` is extracted in `view/result-view.ts`:

```ts
function chooseMonster(level: Level, id: unknown): MonsterKey {
  if (level === "no_signals") return "neutral";
  if (level === "suspicious") return "generic";          // always the generic Odd Shadow
  return isMonsterId(id) ? id : "generic";                // high, critical
}
```

Reason: for a `suspicious` result the monster type is often imperfect and a
named monster ("Bank Ghost") can alarm more than the evidence supports.

### A3. View model additions

```ts
interface ReadyResultView {
  /* existing fields */
  readonly aiNote: { readonly headingKey: "result.aiNote.heading";
                     readonly textKey: "result.aiNote.unavailable" } | null;
  readonly limitsNoteKey: "result.limitsNote";
  readonly noSignals: { summaryKey; notSafeKey;
                        reminderKey: "result.noSignals.reminder" | "result.noSignals.reminderStrong" } | null;
}
interface WithheldResultView { /* existing */ readonly limitsNoteKey: "result.limitsNote"; }
```

`aiUnavailable(verdict, extras)` in `view/semantic-note.ts` (pure):

```ts
function aiUnavailable(status: unknown, mode: unknown): boolean {
  if (mode === "budget-exhausted" || mode === "not-configured") return true;
  if (status === "degraded") return true;
  if (status === "unavailable" && mode === undefined) return true;  // same case REQ-UI-20 maps to not-configured
  return false;                                                     // used, skipped, ok, anything else
}
```

Notes on precedence: the semantic mode comes from `meta.semanticMode` and
wins, as in REQ-UI-20. A `degraded` status with mode `used` is still "not
available" by the request (status `degraded` alone qualifies). Mode `skipped`
with status `degraded` also shows the note, because `degraded` means a client
was called and failed. The note does not depend on level, signals or text.

`semanticNoteKey` is unchanged and rendered only inside Technical_Details.

### A4. `runCheck` (`src/ui/run-check.ts`)

```ts
interface CheckDeps {                       // injected; the page passes the real ones
  ingestImage(file: File, onProgress: (p: { stage: string; progress: number }) => void): Promise<IngestResult>;
  buildAnalyzeRequest(i: { userText: string; ocrText?: string; qrResults?: IngestResult["qrResults"]; locale: Locale }): BuildAnalyzeResult;
  analyzeRequest(r: AnalyzeRequest): Promise<AnalyzeClientResult>;
}
type CheckStatus = "preparing" | "qr" | "ocr-loading" | "ocr-recognizing" | "sending";
type CheckOutcome =
  | { kind: "nothing" }
  | { kind: "failed"; message: MessageRef; notices: NoticeInput[] }
  | { kind: "done"; verdict: Verdict; inputText: string; extras: ResultExtras };
runCheck(deps, { userText, file, locale }, onStatus: (s: CheckStatus, percent?: number) => void): Promise<CheckOutcome>
```

Rules:

1. No text (after trim) and no file: return `nothing`, call nothing.
2. With a file: `ingestImage`. If `errorCode` is set and the user text is
   blank, return `failed` with `ingestErrorMessage(code)`. If it is set but
   there is user text, continue and carry the message as a warning notice.
3. `buildAnalyzeRequest`; `request === null` returns `nothing`.
4. `analyzeRequest(request)`. `ok: false` returns `failed` with
   `analyzeErrorMessage(code, retryAfterSec)`. Success returns `done` with the
   verdict, `request.text` as `inputText` and extras `{ semanticMode: meta.semanticMode,
   ingestNotices, buildNotices, qrResults, userText }`.
5. Every dependency call is inside one `try/catch`; any throw or reject gives
   `failed` with `error.generic`. The function never rejects.
6. The only things passed to `analyzeRequest` are what `buildAnalyzeRequest`
   returned (text and locale). The `File`, its bytes and the canvas never reach
   it; PBT-78 checks this with a spy.

The component adapts the real `ingestImage(file, deps, { onProgress })` to this
shape and creates deps lazily with `createBrowserIngestDeps()` on the first
image, so Tesseract and zxing stay out of the first load (NFR-PAGE-02).

### A5. Theme variables (`src/ui/theme/css-vars.ts`)

```ts
export function paletteToCssVars(p: Palette): Readonly<Record<`--th-${ColorToken}`, string>>
```

The page root sets these as an inline `style` and `globals.css` maps Tailwind
colors to `var(--th-…)`. Switching high contrast swaps the whole object. No
color literal is repeated in components. New declared pairs for this spec are
added to `DECLARED_PAIRS`: `aiNote` text uses `text` on `raised` with a `border`
of `accent`; the limits note uses `muted` on `bg`; both already exist as token
pairs, so only the declared usage rows are added if missing.

### A6. Section order (`src/ui/view/page-layout.ts`)

```ts
type SectionId = "heading" | "levelBanner" | "aiNote" | "actions" | "evidence"
  | "limitsNote" | "limitations" | "monster" | "notices" | "technical";
function resultSections(view: ResultView): readonly SectionId[]
```

- Ready, `monster` or `neutral`: `heading, levelBanner, [aiNote], [actions if
  actions non-empty], evidence (or the neutral summary block for neutral),
  limitsNote, [limitations], monster, [notices], technical`.
- Withheld: `heading, [notices], limitsNote, technical`.

Components render exactly this list in this order, so the hierarchy (level,
action, evidence first; monster after; AI note right under the level) is
enforced by a pure test instead of a DOM test.

## Part B: components

```
src/components/
  App.tsx                  client root: state, preferences, runCheck wiring
  Header.tsx               name, tagline, SettingsPanel toggle
  SettingsPanel.tsx        language, text size, reduce motion, high contrast
  InputForm.tsx            textarea, file input, drop zone, paste hint, buttons
  StatusRegion.tsx         role="status" aria-live polite progress text
  ErrorAlert.tsx           role="alert" message, code in TechnicalDetails
  ResultPanel.tsx          renders resultSections(view) in order
  LevelBanner.tsx          icon + label + meter text + meter bar
  AiNote.tsx               role="note" block, icon + heading + text
  ActionBox.tsx            "What to do now" list
  EvidenceList.tsx         grouped cards, explanation, short evidence, severity text
  HighlightedMessage.tsx   <mark> segments with sr-only prefix
  LimitsNote.tsx           one visible paragraph
  MonsterCard.tsx          name, short text, three tips, inline SVG shape
  Notices.tsx              notice list with tone icon + text
  TechnicalDetails.tsx     <details>, semantic note, codes
  icons.tsx                icon-candle, icon-eye, icon-warning, icon-stop (original inline SVG)
  monster-art.tsx          one simple original inline SVG per artKey
src/app/page.tsx           server component: renders <App />
src/app/layout.tsx         metadata, lang attribute, root classes (edited)
src/app/globals.css        token variables, rem sizes, focus ring, reduced motion
```

Rules for components:

- Props in, JSX out. `App` is the only stateful component; it holds
  `PageState` (`idle | working | done | failed`), preferences, selected file
  and text. Everything else takes props and a `locale`.
- Every string is `t(locale, key, params)`. The `hardcoded-text` test scans for
  literals.
- Level color comes from the CSS variable of `riskMeter` token; label and icon
  are always rendered next to it.
- Icons are inline `<svg aria-hidden="true">` with a text sibling; art is
  original and simple (no third-party shapes).
- `HighlightedMessage` renders `highlights` segments; `<mark>` content is
  preceded by a visually hidden `result.highlight.srLabel`.
- `AiNote` is never inside `<details>` and has no close control.
- `LimitsNote` uses the same size as body text.
- Motion: CSS `transition`/`animation` appear only inside
  `@media (prefers-reduced-motion: no-preference)` and only when the root has
  no `data-reduce-motion="true"`. No flashing.
- Text size: root `font-size: <textSize>%`; all sizes in `rem`.
- First render uses `DEFAULT` preferences (language `en`), then `useEffect`
  reads storage via `getBrowserStorage()` and `loadPreferences`. This avoids a
  hydration mismatch. The only network call is inside `analyzeRequest`.
- After a result, focus moves to the result heading (`tabIndex={-1}`), and
  `announcement` is placed in the live region.

### Result layout (what the user sees)

```
[Your result]
 ┌ Level banner: icon + "A few things to double-check" + "Risk meter: 38 out of 100" ┐
 ┌ AI note (only if the extra check was not available) ┐
 ┌ What to do now: step list ┐
 Why we are cautious / What we found: cards + highlighted message
 TrickHunt looks for warning signs. It cannot prove that a message is genuine.
 Good to know: limitations
 ┌ The kind of trick this looks like: Odd Shadow (smaller card) ┐
 Notices
 ▸ Technical details (collapsed)
```

## Testing strategy

| Area | Test file | Kind |
|---|---|---|
| New and changed dictionary keys | `dictionary.property.test.ts` (existing, extended), `ui-page-keys.test.ts` | PBT-80, examples |
| Level hue and stop icon | `theme/levels.test.ts` (extended) | example |
| Calm suspicious, generic monster | `view/result-view.test.ts`, `result-view.page.property.test.ts` | PBT-75 |
| `aiUnavailable`, `aiNote` | `view/semantic-note.test.ts`, `result-view.page.property.test.ts` | PBT-76 |
| Strong reminder | same | PBT-77 |
| `runCheck` | `run-check.test.ts`, `run-check.property.test.ts` | PBT-78 |
| CSS vars | `theme/css-vars.test.ts`, `css-vars.property.test.ts` | PBT-79 |
| Section order | `view/page-layout.test.ts` | example |
| Hard-coded text, storage, console, fetch, boundaries | `src/components/components.boundaries.test.ts`; `boundaries.test.ts` (extended) | source scan |

Source-scan details for `components.boundaries.test.ts`:

- Reads every `.tsx` in `src/components/` and `src/app/page.tsx`.
- Fails on `fetch(`, `console.`, `localStorage`, `sessionStorage`, `indexedDB`,
  `document.cookie`, `XMLHttpRequest`, `http://`, `https://` (except in
  comments for license links is not allowed either: none are needed).
- Fails on JSX text nodes with letters (regex on `>text<` outside `{}`) and on
  `aria-label="…"`, `title="…"`, `placeholder="…"`, `alt="…"` with a literal
  string. Dynamic `{t(...)}` is accepted.
- Fails on `font-size` or `text-[<n>px]` style fixed pixel values.
- Fails on a `src/server` import and on runtime imports from `src/pipeline`.

## Edge cases

- Text empty and image fails: `failed` with the ingest message, text field kept.
- Image decodes to a QR with no URL and no text: `buildAnalyzeRequest` returns
  `request: null`; page shows `progress.nothing` and the notices.
- Language switched while a result is shown: dictionary text switches; actions
  and limitations stay in the request language (known limitation).
- High contrast on: all declared pairs meet 7:1 for text, already tested.
- `aiNote` for a withheld view: `App` computes it from `meta.semanticMode` and
  passes it as a prop; the pure view only has `limitsNoteKey`.
- Storage unavailable: defaults are used, controls still work for the session.

## Part C: link creature badges (amendment)

Needs `link-creatures` tasks 1 to 4 first. Nothing in `src/core`, `src/analyzers`,
`src/pipeline`, `src/server`, `src/app/api` or the API contract changes.

### C1. Pure helper (`src/ui/view/link-badges.ts`)

```ts
function linkBadgesForGroup(
  group: SignalGroupView,
  linkCreatures: readonly LinkCreatureView[],
): readonly (LinkCreatureView | null)[]
```

For `group.source === "url"`, walk `group.cards` in order. A card gets the
creature `c` when `c.signalIds` contains `card.signalId` and `c` has not been
given to an earlier card. Every other slot is `null`. For any other group the
result is all `null`. Total (`try/catch` gives all `null`), no mutation. Exported
from `src/ui/index.ts`.

### C2. Components

```
src/components/
  LinkBadge.tsx            props { creature: LinkCreatureView; locale }. Plain markup, tokens only.
  icons.tsx                + IconLink, IconToneStrong, IconToneMedium, IconToneSoft, ToneIcon({ iconKey }) (fallback: soft)
  EvidenceList.tsx         edited: url group shows link.plain.note once; each card renders its badge from linkBadgesForGroup
  art/link-creatures.tsx   LINK_ART registry (artKey -> component) and LinkCreatureArt({ artKey, className })
```

`LinkBadge` layout (inside the existing card `<li>`, below severity):

```
 [art 3rem]  Link trait                      <- link.badge.caption, muted, text-base
             Doppelganger                    <- name, font-bold
             This link has traits of a lookalike: ...   <- link.<id>.desc
             [tone icon] Strong sign         <- toneLabelKey, text label, not color alone
             This link has traits that are often used to hide ...  <- explanationKey
             What the hunter saw: paypa1 looks like paypal ...     <- existing evidence label + plain span
```

- The art `<svg>` sits in a wrapper with `style={{ color: "var(--th-" + colorToken + ")" }}`; the art uses `currentColor`. The name and the tone icon use the same variable. Tone label text uses `text`; description and explanation use `text` and `muted`. No color literal.
- Container: `rounded-xl border border-[var(--th-border)] bg-[var(--th-raised)] p-3`. Sizes are `rem`. No transition, no animation.
- The evidence `<span className="break-words">` is plain text. There is no `<a>`, `href`, `onClick`, `role="link"` or `tabIndex` in the badge or the card.
- `link.plain.note` ("Shown as plain text. TrickHunt never opens links.") sits under the url group heading in `EvidenceList`, once per group.

### C3. Art (`art/link-creatures.tsx`)

```ts
const LINK_ART: Readonly<Record<string, (p: { className?: string }) => ReactElement>> = { /* seven artKeys */ };
function LinkCreatureArt({ artKey, className }: { artKey: unknown; className?: string }): ReactElement {
  const Art = typeof artKey === "string" && Object.hasOwn(LINK_ART, artKey) ? LINK_ART[artKey] : null;
  return Art === null ? <IconLink className={className} /> : <Art className={className} />;
}
```

Seven pieces, each at most 12 elements in a `viewBox="0 0 48 48"` frame, stroke
2.5, round caps, `fill="none"` or `currentColor`. Shapes (original, folklore
feel, no existing character):

| `artKey` | Sketch |
|---|---|
| `creature-doppelganger` | Two rounded outlines side by side, the right one mirrored, joined by a dotted centre line |
| `creature-changeling` | A circle split in two halves with swap arrows on its edge |
| `creature-faceless-one` | A hooded triangle with an empty oval where the face would be |
| `creature-masked-stranger` | An oval face with a wide band across it and two eye holes |
| `creature-hydra` | Three small circles (heads) on curved necks that meet at one base |
| `creature-cloaked-gate` | An arch (gate) with a draped triangle over its top |
| `creature-wisp` | A teardrop flame with two small dots beside it |

`IconLink` (in `icons.tsx`, 24 box like the other icons) is two linked loops. It
is also the fallback, so the badge and a later monster guide never render a
broken or empty image. `art-budget.test.ts` already limits the new file to 30 KB.

### C4. Rewritten `signal.url.*.explain` texts (REQ-PAGE-45)

The two texts with "fake" and the claims that a site "is not the real site" are
rewritten. The punycode text no longer states the sender's intent. IP address and
shortener texts stay as they are. Vietnamese is a draft, pending human review;
tests do not pin it.

| Key | English | Vietnamese (draft) |
|---|---|---|
| `signal.url.punycode-host.explain` | The web address has traits of a disguised name. It uses unusual characters that can look like normal letters. Do not open it. | Địa chỉ web có dấu hiệu của một tên đội lốt. Nó dùng ký tự lạ có thể trông giống chữ thường. Đừng mở nó. |
| `signal.url.at-in-authority.explain` | The web address has an @ sign. This can hide where it really goes. Do not open it. | Địa chỉ web có ký tự @. Điều này có thể che nơi nó thật sự dẫn đến. Đừng mở nó. |
| `signal.url.excessive-subdomains.explain` | The web address has many parts. This can make the site name hard to read. Do not open it. | Địa chỉ web có nhiều phần. Điều này có thể làm tên trang khó đọc. Đừng mở nó. |
| `signal.url.brand-lookalike.explain` | The site name looks almost like a well-known brand. It has traits of a lookalike. Type the real address yourself. | Tên trang web trông gần giống một thương hiệu nổi tiếng. Nó có dấu hiệu của một tên bắt chước. Hãy tự gõ địa chỉ thật. |
| `signal.url.credential-keywords.explain` | The link has words like login or verify. Pages that ask for passwords often use them. Do not enter your password. | Đường dẫn có chữ như login hoặc verify. Các trang đòi mật khẩu hay dùng những chữ này. Đừng nhập mật khẩu. |
| `signal.url.ip-address-host.explain` | *(unchanged)* | *(unchanged)* |
| `signal.url.known-shortener.explain` | *(unchanged)* | *(unchanged)* |

New keys (tier C, both languages):

| Key | English | Vietnamese (draft) |
|---|---|---|
| `link.badge.caption` | Link trait | Dấu hiệu của đường dẫn |
| `link.plain.note` | Shown as plain text. TrickHunt never opens links. | Chỉ hiển thị dạng chữ. TrickHunt không bao giờ mở đường dẫn. |

### C5. Tests

| Area | Test file | Kind |
|---|---|---|
| `linkBadgesForGroup` | `src/ui/view/link-badges.test.ts`, `link-badges.property.test.ts` | examples, PBT-110 |
| Art registry, fallback, forbidden tags and colors | `src/components/art/link-creatures.test.ts` | examples, PBT-111 |
| Badge and card markup (`renderToStaticMarkup`, as `registry.test.ts` does) | `src/components/LinkBadge.test.ts`, `src/components/EvidenceList.link.property.test.ts` | examples, PBT-112 |
| Wording of the key set | `src/ui/i18n/link-wording.property.test.ts` | PBT-113 |
| Source scan for `href`, `<a `, `onClick` in the three link files, and hard-coded text in `LinkBadge.tsx` | `src/components/components.boundaries.test.ts` (edited) | source scan |
| New declared pairs | `src/ui/theme/pairs.ts` (existing tests and PBT-72 cover them) | existing |

The tests run in `node` with `react-dom/server`, no jsdom, no new dependency.

### C6. Edge cases

- Evidence that contains `<a href="x">` is escaped by React and shown as text; PBT-112 checks it.
- A creature whose card was dropped (blank evidence) is not in `linkCreatures`, so no badge appears without evidence.
- Language switch: the badge re-renders from keys at once; no re-analysis.
- High contrast: art and text use the high-contrast tokens through the same CSS variables.

## Part D: link spotlight (amendment)

Needs group 7 (Part C) done. Nothing in `src/core`, `src/analyzers`,
`src/pipeline`, `src/server`, `src/app/api` or the API contract changes.

Decision: **move** the badge. `EvidenceList` stops rendering it, so each creature
appears once. Alternatives considered: copy the badge (a creature shows twice,
longer page, harder to test "once"); a compact reference on the card (a second
format to build and word). Moving is the simplest and keeps REQ-PAGE-50 true. The
url card keeps `link.plain.note`, explanation, evidence and severity, so every
badge stays backed by a visible card.

### D1. Layout

```
[Your result]
 ┌ Level banner ┐
 Links in this message            <- new: result.links.heading
   • Doppelganger badge           <- LinkBadge, same as before
   • Cloaked Gate badge
 ┌ AI note (if any) ┐
 ┌ What to do now ┐
 What we found: url cards (no badge) + highlighted message
 ...
```

### D2. Pure layout change (`src/ui/view/page-layout.ts`, `journal.ts`)

- `SectionId` gets `"linkSpotlight"`.
- `resultSections(view)`: for a ready view with `view.linkCreatures.length > 0`, insert `"linkSpotlight"` right after `"levelBanner"`. A withheld view, and a ready view with no creatures, return the same list as today (REQ-PAGE-54). The function stays total (a non-array `linkCreatures` counts as empty).
- `journal.ts`: `linkSpotlight` is not in `PAGE1_SECTIONS`, so it lands in `page2` and, because `page2` keeps `resultSections` order, it is first there (REQ-PAGE-53, Open point 7). Page 1 limits (`MAX_CLUES`, `MAX_ACTIONS`, one note) do not change.
- `link-badges.ts` and `linkBadgesForGroup` are not edited and not deleted.

### D3. Components

```
src/components/
  LinkSpotlight.tsx   props { creatures: readonly LinkCreatureView[]; locale }. Returns null for [].
  ResultPanel.tsx     renderSection: case "linkSpotlight" -> <LinkSpotlight creatures={view.linkCreatures} locale={locale} />
  EvidenceList.tsx    edited: no linkBadgesForGroup, no LinkBadge import; keeps link.plain.note once in the url group
  LinkBadge.tsx       not edited
```

`LinkSpotlight`:

```tsx
<section aria-labelledby="link-spotlight-heading">
  <h3 id="link-spotlight-heading" className="text-2xl font-bold">{t(locale, "result.links.heading")}</h3>
  <ul className="mt-3 space-y-3">
    {creatures.map((c) => <li key={c.id}><LinkBadge creature={c} locale={locale} /></li>)}
  </ul>
</section>
```

- The heading uses the same size class as the Evidence_List heading. No new frame, icon, token or animation. The badge keeps its own existing container; the spotlight adds none (`hunter-scene-rules.md`: at most one framed object per screen applies to the journal paper, and the badge is already inside it today).
- The id is fixed because there is one spotlight per result. A test checks it appears once.
- `InfoFrame.tsx` already calls `renderSection`, so the spotlight appears in the journal without further change; `splitSections` must place it in the scrolling part (not pinned). The edit to `split-sections` (if it lists ids) is part of task 8.2.
- `renderSection` returns `null` for `linkSpotlight` on a withheld view, as for other ready-only sections.

### D4. Dictionary

One new key, tier C (default tier, so `voice.ts` needs no new rule; the test that every key has a tier must still pass):

| Key | English | Vietnamese (draft, pending human review) |
|---|---|---|
| `result.links.heading` | Links in this message | Đường dẫn trong nội dung |

Joins the PBT-113 key set. It uses no horror word, no safe-family word and says nothing about the link being a scam. `link.badge.caption` and `link.plain.note` are unchanged.

### D5. How existing tests change

| Test | Change |
|---|---|
| `EvidenceList.link.property.test.ts` (PBT-112) | Edited: assertion "shows every creature name exactly once" becomes "shows no creature name"; escaping and no-link-element checks stay. Add PBT-115 here (no badge, no art, evidence kept, `link.plain.note` once). |
| `LinkBadge.test.ts` | Not edited. The badge component is unchanged. |
| `link-badges.test.ts`, `link-badges.property.test.ts` (PBT-110) | Not edited. |
| `link-wording.property.test.ts` (PBT-113) | Edited: the key set gains `result.links.heading`. |
| `view/page-layout.test.ts` | Edited: new examples for a view with and without links; existing examples unchanged. |
| `journal` tests | Edited only if one pins `page2` for a view with links. |
| `ResultPanel.test.ts` | Edited: example with links shows the heading and badges before the action box. PBT-114 is added in a new `ResultPanel.link.property.test.ts` (`renderToStaticMarkup`, no jsdom). |
| `components.boundaries.test.ts` | Edited: `href`, `<a ` and `onClick` are also forbidden in `LinkSpotlight.tsx` and `ResultPanel.tsx`; the hard-coded text scan covers `LinkSpotlight.tsx`; add sanity cases. |
| `dictionary` tests, `voice` tier test | Cover the new key through existing checks. |

### D6. Edge cases

- Many creatures (all seven): the spotlight grows. In the journal it scrolls inside page 2, which is already a keyboard-focusable scroll region.
- A creature without evidence is not in `linkCreatures` (Part C), so the spotlight never shows a badge without its card.
- Language switch: heading and badges re-render from keys; no re-analysis.
- `linkCreatures` empty or garbage: no section, no empty wrapper.
- Evidence with markup stays escaped text (PBT-114).
