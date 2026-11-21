# Design Document

## Overview

Configuration, dictionary data, two SVG components and tests. No algorithm
change. The method is the one of `rules-tuning-v1` to `v3`: diagnose first,
prototype the configuration, measure, then write it down.

The detection split stays as in the README "Known limits": rules alone have low
recall on unfamiliar wording; the AI layer carries most of the detection for
these two types. The new text signals do two jobs: they catch the common
wordings in rules-only mode, and they let the monster choice name the right
monster when the AI layer also fires (without a text signal the AI signals tie
with `job-bait`, and `job-bait` wins the tie; see "Known limits").

## Files

| File | Change |
|---|---|
| `src/analyzers/text-analyzer.config.ts` | Two groups (appended after `text.financial-institution`); payment phrases added |
| `src/pipeline/verdict.ts` | `MonsterId` gains two ids |
| `src/pipeline/monsters.config.ts` | `SpecificMonsterId`, two `MONSTERS`, `MONSTER_ORDER` |
| `src/pipeline/overlap.config.ts` | Two groups extended |
| `src/pipeline/rules.config.ts` | Two rules |
| `src/pipeline/messages.config.ts` | `ACTIONS_BY_MONSTER` en and vi |
| `src/pipeline/eval/new-monsters-samples.ts` (new) | `NM_SAMPLES` |
| `src/pipeline/new-monsters.test.ts`, `new-monsters.property.test.ts` (new) | Examples and PBT-145, 146, 149, 150 |
| `src/analyzers/text-analyzer.v5.test.ts`, `text-analyzer.v5.property.test.ts` (new) | Phrase tests and PBT-147 |
| `src/ui/monsters.ts` | Two presentation entries |
| `src/ui/theme/palettes.ts`, `pairs.ts` | Two tokens; `MONSTER_TOKENS` |
| `src/ui/i18n/en.ts`, `vi.ts`, `signal-ids.ts` | Keys and ids |
| `src/ui/new-monsters.property.test.ts` (new) | PBT-148 |
| `src/components/art/monsters-new.tsx` (new), `registry.tsx`, `monsters-new.test.ts` (new) | Art |
| `README.md` | NFR-RT-06 |
| Blocked: `src/ui/view/result-view.ts`, `src/ui/bestiary.ts`, `src/ui/i18n/voice.ts`, tests in the list below | After the maintainer answers Q1 to Q4 |

## Diagnosis (before)

Run on the unchanged code (a temporary `tmp-` test, deleted). Rules_Mode is
`createPipeline({ llmClient: null })`. Fake_Mode returns, for investment,
`semantic.too-good-to-be-true` and `semantic.isolation-secrecy`, and for
romance, `semantic.relationship-or-job-bait` and `semantic.pressure-escalation`,
each at severity 0.45 with the first 20 characters of the sample as evidence.
Benign samples use a fake that returns no signals (so Fake_Mode equals
Rules_Mode for them). Format: level / monster, score, signals.

| Sample | Rules_Mode (before) | Fake_Mode (before) |
|---|---|---|
| nm-inv-en-1 | no_signals / null, 0, none | high / job-bait, 70, too-good-to-be-true, isolation-secrecy |
| nm-inv-en-2 | no_signals / null, 0, none | high / job-bait, 70, same two |
| nm-inv-en-3 | no_signals / null, 0, none | high / job-bait, 70, same two |
| nm-inv-vi-1 | no_signals / null, 0, none | high / job-bait, 70, same two |
| nm-rom-en-1 | no_signals / null, 0, none | high / generic, 70, relationship-or-job-bait, pressure-escalation |
| nm-rom-en-2 | no_signals / null, 0, none | high / generic, 70, same two |
| nm-rom-en-3 | no_signals / null, 0, none | high / generic, 70, same two |
| nm-rom-vi-1 | suspicious / generic, 40, text.off-platform 0.4 | critical / job-bait, 82, relationship-or-job-bait, pressure-escalation, text.off-platform |
| nm-ben-en-1 to 7, 9, 10 | no_signals / null | no_signals / null |
| nm-ben-en-8 (gift card for Mum) | suspicious / generic, 40, text.payment-request 0.4 (existing phrase `buy a gift card`) | same |
| nm-ben-vi-1, nm-ben-vi-2 | no_signals / null | no_signals / null |

Reading: in Rules_Mode 7 of 8 scams give no signal at all. In Fake_Mode the
level is already `high` or above, but the monster is wrong in all 8 (`job-bait`
for the four investment samples and `nm-rom-vi-1`, `generic` for the other
three romance samples). `nm-ben-en-8` is already `suspicious` today; this spec
must not make it worse.

## Hard-coded places and questions (answered)

**Answers from the maintainer: Q1 yes, Q2 yes, Q3 yes, Q4 yes.** Q4 is applied as recommended: the hand-written lists of `MonsterStage.test.ts`, `svg-markup.art.test.ts`, `result-view.property.test.ts` and `scene.test.ts` are extended; the other tests in the list stay unchanged. Tasks 8.x are unblocked.

**Two more tests edited (task 8.2, approved by the maintainer).** `src/ui/bestiary-pages.test.ts` and `src/ui/bestiary.property.test.ts` (PBT-132) were also edited. This is a knock-on of Q2: adding `investment` and `romance` to `MONSTER_ORDER` makes the bestiary 15 entries and 16 pages, and puts the two monsters before `generic`. Only counts, page indices and the hard-coded monster list changed; no assertion was weakened.

Places that hard-code monster ids. None is changed by this spec until the
maintainer answers.

Rendering and view code (non-test):

| Place | What it does | What breaks without a change |
|---|---|---|
| `src/ui/view/result-view.ts` `MONSTER_TEXT` (`Record<MonsterKey, ...>`, lines 98 to 120) | Maps each monster to its short text key and three tip keys | Type error, and at run time `MONSTER_TEXT["investment"]` is `undefined`, so a result with the new monster breaks |
| `src/ui/bestiary.ts` `MONSTER_ORDER` (lines 24 to 30) | Field guide order of monsters | The new monsters are missing from the field guide. Bestiary counts change if added |
| `src/ui/i18n/voice.ts` `EN_HORROR`, `VI_HORROR` (and the vocabulary list in `halloween-voice.md`) | Horror word lists; every monster `name` and `short` must carry one (PBT-104) | "Profit Goblin" and "Heart Wraith" have none of the listed words |
| `src/pipeline/eval/probe-report.ts` (monster columns, lines 250 and 251) | Matrix of the probe report | The matrix has no column for the new monsters (report only; no test depends on it) |

Tests that hard-code monster ids (they keep passing; each would only need a
change if the maintainer wants them to cover the new monsters):
`src/components/MonsterStage.test.ts` (list of six, "six monsters"),
`src/components/result-markup.property.test.ts`, `src/components/stage/svg-markup.art.test.ts`,
`src/components/art/art.test.ts` (this one must change, see requirements),
`src/pipeline/pipeline.property.test.ts`, `src/pipeline/config.test.ts` (must change),
`src/pipeline/eval/samples.test.ts` (`SPECIFIC`), `src/pipeline/eval/probe-samples.test.ts`,
`src/ui/view/journal.property.test.ts`, `src/ui/view/link-creatures-view.property.test.ts`,
`src/ui/view/result-view.property.test.ts`, `src/ui/view/result-view.page.property.test.ts`,
`src/ui/view/scene.test.ts`, `src/ui/bestiary.property.test.ts`,
`src/ui/bestiary.test.ts`, `src/ui/bestiary-pages.property.test.ts`,
`src/ui/monsters.test.ts` (the names test lists five; passes unchanged),
`src/ui/i18n/dictionary.test.ts`, `src/ui/i18n/voice.test.ts`.

Questions:

- **Q1.** May I add the two entries to `MONSTER_TEXT` in `result-view.ts` (data only, same shape as the others) and add result-view tests for them? Without it, REQ-UI-52 cannot be met and a real result with the new monster would break the page. *My recommendation: yes. It is a pure data edit.*
- **Q2.** Should the two monsters appear in the field guide (`bestiary.ts` `MONSTER_ORDER`)? If yes, the entry count goes from 13 to 15 and the tests `bestiary.test.ts`, `bestiary-pages.property.test.ts` change their numbers. *My recommendation: yes, in the same change, so the guide matches the six monsters in the README.*
- **Q3.** `monster.*.name` must contain a horror word (PBT-104). May I add `goblin`, `goblins`, `wraith`, `wraiths` to `EN_HORROR` and `yêu tinh` to `VI_HORROR` in `voice.ts`, and the same words to the vocabulary list in `halloween-voice.md`? The alternative is to rename the monsters, which you fixed. *My recommendation: add the words.*
- **Q4.** Do you want the existing tests that list the six monster ids by hand (`MonsterStage.test.ts`, `svg-markup.art.test.ts`, the `*.property.test.ts` lists above) to cover the new monsters? That is a list edit in each file. *My recommendation: yes for `MonsterStage.test.ts`, `svg-markup.art.test.ts`, `result-view.property.test.ts` and `scene.test.ts`; leave the others.*

One more open point, with a default: `nm-inv-en-1` says "Deposit $300 to join".
The amount sits inside the phrase, and the matcher has no wildcard (a
wildcard is an algorithm change), so no deposit phrase matches and Rules_Mode
stops at `suspicious`. REQ-PIPE-81 asks for `high` "when a deposit phrase is
present", and no phrase is present in this sample. Default: keep it at
`suspicious` in Rules_Mode and `high` in Fake_Mode. Tell me if you want an
amount-specific phrase added instead.

## Changes

All values below are the prototype that was measured (next section).

### `text-analyzer.config.ts`

`text.investment-pitch`, weight 0.35. `whyItMatters`: "Promised profits with no
risk, a private trading group or a deposit to join are how investment scams
hook people. Real investments always carry risk and never promise a fixed
return."

- en: `guaranteed returns`, `guaranteed profit`, `guaranteed daily profit`, `guaranteed daily returns`, `risk free investment`, `risk free crypto investment`, `risk free trading`, `risk free returns`, `double your money`, `doubled his money`, `doubled her money`, `daily profit`, `profit every day`, `private trading group`, `private trading channel`, `private investment group`, `private investment channel`, `vip signals`, `vip trading signals`, `vip channel`, `vip trading group`, `deposit to join the group`, `deposit to join the channel`, `deposit to join the vip channel`
- vi: `cam kết lợi nhuận`, `lợi nhuận cam kết`, `đầu tư không rủi ro`, `nhóm đầu tư kín`, `nhóm giao dịch kín`, `lợi nhuận mỗi ngày`, `nhân đôi số tiền`, `nạp tiền để tham gia`, `nạp tiền vào nhóm`, `cam kết lãi`

`text.romance-bait`, weight 0.35. `whyItMatters`: "Sudden closeness from
someone you barely know, followed by a story about being abroad, a frozen
account or a promise to pay you back, is how romance scams ask for money."

- en: `we only talked for a week`, `we only met a week ago`, `we are meant to be together`, `i have never felt this connected to anyone`, `stuck at a foreign port`, `stuck at the port`, `working on an oil rig`, `i work on an oil rig`, `deployed overseas and i need your help`, `my bank account is frozen`, `my account is frozen while i travel`, `i will repay you when i arrive`, `i will pay you back when i arrive`, `i will repay you when i return`, `i will pay you back when i return`
- vi: `mới quen một tuần`, `mới quen nhau một tuần`, `dù chúng ta mới quen`, `công tác nước ngoài và bị khóa thẻ`, `đang ở nước ngoài và bị khóa thẻ`, `tài khoản bị đóng băng khi ở nước ngoài`, `sẽ trả lại em khi về`, `sẽ trả lại anh khi về`, `kẹt ở cảng nước ngoài`, `làm việc trên giàn khoan`

No phrase is a bare word. `overseas`, `abroad`, `deployed overseas` and
`working overseas` alone are not phrases, so "My brother is deployed overseas
this year" and "I am working overseas this year, I will be home in June" give
no signal.

`text.payment-request` gains (nothing removed, weight 0.4 unchanged):

- en: `send a gift card`, `send me a gift card`, `buy a gift card for me`, `buy me a gift card`, `send me gift cards`, `deposit to join`, `deposit to start`, `send your first deposit`, `make your first deposit`, `add funds to activate`, `add funds to start`
- vi: `gửi thẻ quà tặng`, `gửi cho anh thẻ quà tặng`, `mua giúp anh thẻ quà tặng`, `triệu để tham gia`

I did not add bare money requests such as `send me money`, because the benign
samples `ben-en-6` and `b2-ben-en-3` ("can you send me the money for ...") must
stay `no_signals`. `buy a gift card for me` does not match "buy a gift card
for Mum's birthday" because phrases match whole words.

Known risk of `triệu để tham gia` ("2 million to join"): a legitimate "a fee of
2 million to join the course" gives one `text.payment-request` (suspicious,
`generic`). The phrase is in the tuning set only for `nm-inv-vi-1`.

### `monsters.config.ts`

| Monster | Weights |
|---|---|
| `investment` | `text.investment-pitch` 2, `semantic.too-good-to-be-true` 1, `semantic.isolation-secrecy` 1, `text.payment-request` 1 |
| `romance` | `text.romance-bait` 2, `semantic.relationship-or-job-bait` 1, `semantic.emotional-manipulation` 1, `semantic.isolation-secrecy` 1, `text.payment-request` 1 |

Why 2 for the New_Text_Signals: with 1, `nm-rom-vi-1` (relationship 1 +
off-platform 1 for `job-bait`, relationship 1 + romance-bait 1 for `romance`)
ties and `job-bait` wins by order. With 2 the new monster wins, and one signal
still cannot name a monster at `suspicious`, because the gate of REQ-PIPE-67
needs two weighted overlap groups (checked by PBT-145). Why the other weights
are a subset of `job-bait`'s: REQ-PIPE-74 and PBT-149. `semantic.pressure-escalation`
is not weighted for `romance`: with it, the existing test "emotional-manipulation
plus pressure-escalation stays generic" and "romance-style combination picks
job-bait" (`semantic-monster.v4.test.ts`) would break.

### `overlap.config.ts`

A signal id may be in one group only (REQ-PIPE-22), and both
`semantic.too-good-to-be-true` and `semantic.relationship-or-job-bait` are
already in a group. So the new ids join those groups:

- `["text.prize-reward", "text.investment-pitch", "semantic.too-good-to-be-true"]`
- `["text.job-offer", "text.romance-bait", "semantic.relationship-or-job-bait"]`

Review of the first group (the one holding `text.prize-reward`): only the
strongest signal of a group scores, so `investment-pitch` (0.35) next to
`prize-reward` (0.6) adds nothing, and next to `too-good-to-be-true` (0.45) the
AI signal scores. No Earlier_Sample fires `investment-pitch`, so no earlier
score changes (measured). The cost: an investment pitch that also contains a
prize phrase counts once; that message is already `high` through the payment
rules.

### `rules.config.ts`

Two rules appended before `reputation-listed`: `investment-with-payment`
(`text.investment-pitch` and `text.payment-request`, `high`) and
`romance-with-payment` (`text.romance-bait` and `text.payment-request`,
`high`). The aggregate already gives 61 for 0.35 plus 0.4, so the rules are a
floor that keeps the result at `high` if a weight is tuned down later.

### `messages.config.ts`

- en `investment`: "Do not send money or join a trading group because of promised returns. Check the company with your financial regulator first."
- en `romance`: "Do not send money or gift cards to someone you have only met online. Talk to a friend or family member you trust first."
- vi `investment` (draft): "Đừng chuyển tiền hoặc vào nhóm đầu tư vì lời hứa lợi nhuận. Hãy kiểm tra công ty với cơ quan quản lý tài chính trước."
- vi `romance` (draft): "Đừng gửi tiền hoặc thẻ quà tặng cho người bạn chỉ quen qua mạng. Hãy hỏi một người thân hoặc bạn bè bạn tin tưởng trước."

No dictionary key holds actions: they come from this file (the LLM never
writes them).

### UI data

Presentation: `investment` with `monster.investment.name`, `monster-investment`,
`monster-investment-goblin`; `romance` with `monster.romance.name`,
`monster-romance`, `monster-romance-wraith`.

Color tokens (hex), measured with the same formula as `contrast.ts`:

| Token | Normal | On surface / raised | High contrast | On surface / raised |
|---|---|---|---|---|
| `monster-investment` | `#E8C26A` | 9.18 / 7.50 | `#F0D48E` | 13.85 / 12.96 |
| `monster-romance` | `#E58CFF` | 7.08 / 5.79 | `#EDAAFF` | 11.26 / 10.53 |

Thresholds: 4.5 normal, 7 high contrast text. Both tokens are added to
`MONSTER_TOKENS` in `pairs.ts`, which crosses them with `surface` and `raised`
(four new declared pairs; both palettes pass).

Dictionary (English first; Vietnamese is a draft). Tier A for `name` and
`short`, tier C for tips and signal explanations.

| Key | English | Vietnamese (draft) |
|---|---|---|
| `monster.investment.name` | Profit Goblin | Yêu tinh lợi nhuận |
| `monster.investment.short` | A goblin counting coins in the dark. It promises big profits and wants a deposit first. | Yêu tinh đếm tiền xu trong bóng tối. Nó hứa lãi lớn và đòi bạn nạp tiền trước. |
| `monster.investment.tip1` | It promises high profits with no risk. | Nó hứa lợi nhuận cao mà không có rủi ro. |
| `monster.investment.tip2` | It invites you to a private group and asks for a deposit to join. | Nó mời bạn vào nhóm kín và đòi tiền để tham gia. |
| `monster.investment.tip3` | It pushes you to hurry before the spots run out. | Nó giục bạn nhanh lên vì sắp hết chỗ. |
| `monster.romance.name` | Heart Wraith | Bóng ma trái tim |
| `monster.romance.short` | A hooded wraith in the fog, holding a heart. It wants your trust first and your money next. | Một bóng ma trùm mũ giữa sương, tay cầm trái tim. Nó lấy lòng tin trước rồi mới xin tiền. |
| `monster.romance.tip1` | A stranger says they love you after only a few days. | Người lạ nói yêu bạn chỉ sau vài ngày. |
| `monster.romance.tip2` | They say they are far away, in a risky job or locked out of their account. | Họ nói đang ở xa, làm việc nguy hiểm hoặc bị khóa tài khoản. |
| `monster.romance.tip3` | They ask for money or gift cards and promise to pay you back. | Họ xin tiền hoặc thẻ quà tặng và hứa trả lại. |
| `signal.text.investment-pitch.explain` | The message promises high profits, little risk or a private trading group. Real investments carry risk and never promise a fixed return. Check the firm with your financial regulator. | Tin nhắn hứa lợi nhuận cao, ít rủi ro hoặc mời vào nhóm giao dịch kín. Đầu tư thật luôn có rủi ro và không hứa lãi cố định. Hãy kiểm tra công ty với cơ quan quản lý tài chính. |
| `signal.text.romance-bait.explain` | The message mixes sudden closeness with a story about being far away, a frozen account or paying you back later. Scammers use this to ask for money. Talk to a friend or family member before you reply. | Tin nhắn vừa tỏ ra rất thân thiết vừa kể chuyện ở xa, tài khoản bị khóa hoặc hứa trả tiền sau. Kẻ lừa đảo dùng cách này để xin tiền. Hãy hỏi một người thân hoặc bạn bè trước khi trả lời. |

Sentence length is at most 18 words (tier A) and 25 words (the rest). No
"safe", "clean", "guaranteed" or "definitely" appears (the voice and wording
tests check it). `monster.*.short` carries a horror word (dark, fog) in
English and `bóng tối`, `sương` or `bóng ma` in Vietnamese. The names carry
one only after Q3.

### Art

The registry, the monster components and their tests exist
(`registry.tsx`, `monsters.tsx`, `monsters-authority.tsx`, `monsters-generic.tsx`,
`art.test.ts`, `registry.test.ts`, `art-budget.test.ts`,
`stage/svg-markup.art.test.ts`). So the two SVGs are built, as one new file
`monsters-new.tsx` (the existing files are 9 to 24 KB; the budget is 30 KB per
file).

- `MonsterInvestmentGoblin`: a hunched body (`monster-investment`), a head with two eyes (`moon`), a coin stack (`lantern`) and a small rising line chart (`stone`). Five shapes plus one `-detail` group (coin shine).
- `MonsterRomanceWraith`: a hooded translucent body (`monster-romance` at fill-opacity 0.6, `fog`), two hollow eyes (`ground`) and a heart in the hands (`monster-romance`, `moon` rim). Five shapes plus one `-detail` group.

Both follow the markup rules of the others (200x200 `viewBox`, `aria-hidden`,
`focusable="false"`, `data-part` groups, only `var(--th-...)` tokens, no
`<text>`, `<title>`, `<filter>`, `<animate>`). The steering detail standard
(4 to 6 shades, gradients, rim light) is relaxed for these two pieces, as you
asked for 3 to 5 shapes; the registry comment already calls the pieces simple
placeholders that can be swapped later. The existing per-monster tests ask for
`<linearGradient` and 4 to 8 tokens; the new test file asks only for the
markup rules and tokens that exist in both palettes. The goblin is built and
shown first.

## Evaluation set

Exact texts (synthetic; no real brand, no link, no digit run of 8 or more).
Locale is `vi` for the ids ending `-vi-n`, `en` otherwise.

Investment scam (`expectedMonster: "investment"`; Rules_Mode at least `suspicious`; Fake_Mode at least `high`):

- `nm-inv-en-1`: "Our private trading group posted 35% returns this week. Deposit $300 to join the VIP channel before the spots run out."
- `nm-inv-en-2`: "Risk-free crypto investment, guaranteed 2% profit every day. Send your first deposit to start earning today."
- `nm-inv-en-3`: "A friend recommended our trading bot, it doubled his money in a month. Register now and add funds to activate it."
- `nm-inv-vi-1`: "Nhóm đầu tư kín cam kết lợi nhuận 5% mỗi ngày, nạp 2 triệu để tham gia ngay hôm nay."

Romance scam (`expectedMonster: "romance"`; same levels):

- `nm-rom-en-1`: "Hello dear, I know we only talked for a week but I feel we are meant to be together. I am a doctor working overseas and I need your help to pay the customs fee for my package, please send a gift card."
- `nm-rom-en-2`: "My love, my bank account is frozen while I travel abroad. Can you send me money for a flight ticket to come and see you? I will repay you when I arrive."
- `nm-rom-en-3`: "I have never felt this connected to anyone. I am stuck at a foreign port and need $400 for the repair of my ship, please keep this between us."
- `nm-rom-vi-1`: "Anh rất yêu em dù chúng ta mới quen một tuần. Anh đang công tác nước ngoài và bị khóa thẻ, em gửi giúp anh tiền mua vé máy bay nhé, đừng nói với ai."

Benign (`expectedMonster: null`, `minLevel: "no_signals"`; Benign_Pass in both modes):

- `nm-ben-en-1`: "Bitcoin rose 3% today according to the morning news, the market is volatile."
- `nm-ben-en-2`: "Our bank's savings account now offers a 4% annual rate. See the terms in the app."
- `nm-ben-en-3`: "I read that index funds usually return more than savings accounts over many years, interesting article."
- `nm-ben-en-4`: "Join our hiking group on Telegram, we meet on Saturdays at 8am."
- `nm-ben-en-5`: "Our running club grew by 40% last month, thanks everyone for inviting friends."
- `nm-ben-en-6`: "I miss you so much, the flight lands at 6pm and I will see you at the airport."
- `nm-ben-en-7`: "My brother is deployed overseas this year and we video call every Sunday."
- `nm-ben-en-8`: "Can you buy a gift card for Mum's birthday? I will transfer you the money tonight."
- `nm-ben-en-9`: "I am working overseas this year, I will be home in June and we can celebrate then."
- `nm-ben-en-10`: "Congrats on the engagement! We feel so happy for you both."
- `nm-ben-vi-1`: "Anh nhớ em nhiều, tối nay anh gọi video cho em nhé."
- `nm-ben-vi-2`: "Công ty mình đang đầu tư thêm máy móc mới cho xưởng, tháng sau lắp xong."

Sample type (`NmSample`): `id`, `locale`, `text`, `kind` (`investment`, `romance`, `benign`), `expectedMonster`, `minLevelRules`, `minLevelFake`, and `rulesHighMonster` (true for `nm-inv-en-2`, `nm-inv-en-3`, `nm-inv-vi-1`). It is a separate type from `EvalSample`, because `samples.test.ts` demands that scam samples have a `minLevel` of `high` or `critical` and counts 75, and `eval.test.ts` demands the monster in Rules_Mode for every scam. Neither file is edited.

Fake_Mode: `FakeLlmClient.responding(JSON.stringify({ signals }))` with the signals above at 0.45. A text-only fake uses the first 20 characters of the sample as evidence (it must be a substring of the redacted text; digits of 4 or more are redacted, so the evidence never includes them).

## Prototype measurement

The configuration of "Changes" was applied to the current code (then reverted;
the working tree is clean) and measured.

Suite: 208 files, 2715 tests. Result with the prototype: 202 files pass; 8
tests in 6 files fail, all listed in the requirements and all of the kind
"list of ids is pinned" (10 text ids, `MonsterId` list in `config.test.ts`,
24 signal ids, monster presentation, dictionary coverage). All 75
`EVAL_SAMPLES` pass unchanged (`eval.test.ts`), all probe regression tests
pass, and `monster.test.ts`, `monster.gate.property.test.ts`,
`semantic-monster*.test.ts` and `combine*.test.ts` pass unchanged.

NM_Samples with the prototype (level / monster, score):

| Sample | Rules_Mode | Fake_Mode |
|---|---|---|
| nm-inv-en-1 | suspicious / generic, 35 | high / investment, 70 |
| nm-inv-en-2 | high / investment, 61 | critical / investment, 82 |
| nm-inv-en-3 | high / investment, 61 | critical / investment, 82 |
| nm-inv-vi-1 | high / investment, 61 | critical / investment, 82 |
| nm-rom-en-1 | high / romance, 61 | critical / romance, 82 |
| nm-rom-en-2 | suspicious / generic, 35 | high / romance, 70 |
| nm-rom-en-3 | suspicious / generic, 35 | high / romance, 70 |
| nm-rom-vi-1 | high / romance, 61 | critical / romance, 82 |
| all 12 benign | unchanged from "before" (11 `no_signals`, `nm-ben-en-8` suspicious / generic) | same |

Re-measured when task 4.3 ran (`riskScore`, final code): no difference from
the table. All 8 scam samples match level, monster and score in both modes.
The 11 `no_signals` benign samples score 0; `nm-ben-en-8` is suspicious /
generic with score 40 in both modes (the table gave no score for it).

## Before and after

Counts over the eight scam and twelve benign NM_Samples. "After" is the
prototype and is re-measured when the tasks run.

| Measure | Before Rules_Mode | After Rules_Mode | Before Fake_Mode | After Fake_Mode |
|---|---|---|---|---|
| Scams with the right monster | 0 of 8 | 5 of 8 | 0 of 8 | 8 of 8 |
| Missed scams (`no_signals`) | 7 of 8 | 0 of 8 | 0 of 8 | 0 of 8 |
| Scams below `high` | 8 of 8 | 3 of 8 (all `suspicious`) | 0 of 8 | 0 of 8 |
| Benign with a monster other than `generic` or `null` | 0 | 0 | 0 | 0 |
| Benign at `high` or above | 0 | 0 | 0 | 0 |
| Benign at `suspicious` | 1 | 1 (`nm-ben-en-8`, as before) | 1 | 1 |
| Earlier_Samples changed | n/a | 0 of 75 `EVAL_SAMPLES`, 0 probe samples | n/a | 0 (semantic tests unchanged) |

### Measured in task 11.1 (final code)

`npx vitest run`: 214 files, 2842 tests, all pass. The measured figures below
come from `new-monsters.test.ts`, `eval.test.ts` and the probe regression
tests in that run, and they equal the prototype table.

| Measure | After Rules_Mode | After Fake_Mode |
|---|---|---|
| Scams with the right monster | 5 of 8 | 8 of 8 |
| Missed scams (`no_signals`) | 0 of 8 | 0 of 8 |
| Scams below `high` | 3 of 8 (`nm-inv-en-1`, `nm-rom-en-2`, `nm-rom-en-3`, all `suspicious`) | 0 of 8 |
| Benign with a monster other than `generic` or `null` | 0 of 12 | 0 of 12 |
| Benign at `high` or above | 0 of 12 | 0 of 12 |
| Benign at `suspicious` | 1 (`nm-ben-en-8`) | 1 |
| Earlier_Samples changed | 0 of 75 `EVAL_SAMPLES`, 0 probe samples | 0 (semantic tests unchanged) |

### Existing tests that changed, and why

All changes only extend a hard-coded list or count for the two new ids
(2 more text groups, 2 more monsters, 2 more bestiary entries).

| Test file | Change | Reason |
|---|---|---|
| `text-analyzer.config.test.ts` | adds `text.investment-pitch`, `text.romance-bait`; title 10 to 12 | pinned id list |
| `text-analyzer.test.ts` | "covers all 12 groups"; length 12; new `it.each` with one example per new group | pinned group count |
| `pipeline/config.test.ts` | local `MONSTER_IDS` gains `investment`, `romance` | pinned monster list |
| `i18n/signal-ids.test.ts` | title only, 24 to 26 | two new signal ids |
| `components/art/art.test.ts` | `EXPECTED_IDS` gains the two art ids | pinned art registry |
| `ui/bestiary.test.ts` | 13 to 15 entries, 5 to 7 monsters, two `monster:` ids in order | Q2 |
| `ui/bestiary-pages.property.test.ts` | 13 to 15 | Q2 |
| `ui/bestiary-pages.test.ts` | 14 to 16 pages, 13 to 15 entries; clamp and flip boundaries recomputed | Q2 |
| `ui/bestiary.property.test.ts` | monster key list gains the two ids | Q2 |
| `components/MonsterStage.test.ts` | list gains the two ids; distinct drawings 6 to 8 | Q4 |
| `components/stage/svg-markup.art.test.ts` | list gains the two ids | Q4 |
| `ui/view/result-view.property.test.ts` | `MONSTERS` list gains the two ids | Q4 |
| `ui/view/scene.test.ts` | `it.each` list gains the two ids | Q4 |
| `ui/view/result-view.test.ts` | added rows and a `buildResultView` run for both monsters at `high` | Q1 |
| `ui/i18n/voice.test.ts` | added examples for `goblin(s)`, `wraith(s)`, `yêu tinh` | Q3 |
| `ui/view/link-creatures-view.property.test.ts` | local `MONSTER_TEXT` gains `investment` and `romance` (`short` plus `tip1` to `tip3`, keys `monster.<id>.short` and `monster.<id>.tipN`) | `MonsterKey` grew and the `Record<MonsterKey, ...>` no longer type-checked; edit approved by the maintainer |

### Type check

`npx tsc --noEmit` is clean. The one earlier error, in
`src/ui/view/link-creatures-view.property.test.ts:112` (the local
`MONSTER_TEXT: Record<MonsterKey, ...>` lacked `investment` and `romance`
because `MonsterKey` grew), was fixed by adding those two entries with the
maintainer's approval. `npx vitest run` passes (214 files, 2842 tests).

## Accepted recall loss

None. No earlier sample was lowered and no `minLevel` changed. Limit of three
samples; the maintainer is asked before a fourth.

## Known limits

- Rules alone have low recall on unfamiliar wording. The phrases are tuned on 8 scam samples that were visible while writing them, so a Rules_Mode result on them says little about new messages. The 20 `nm-` samples are not an accuracy estimate.
- Three scams stop at `suspicious` in Rules_Mode: `nm-inv-en-1` (the amount splits "deposit ... to join"), `nm-rom-en-2` and `nm-rom-en-3` (no money-request phrase matches; the matcher has no wildcard). The AI layer lifts them to `high`.
- If the AI layer fires (`too-good-to-be-true` plus `isolation-secrecy`, or `relationship-or-job-bait` plus `pressure-escalation`) and no text phrase matches, the monster is still `job-bait` or `generic`, as today. The new weights cannot beat `job-bait` without a New_Text_Signal (REQ-PIPE-74 trades this for a guarantee that no earlier result changes).
- A romance message from a real partner who uses one phrase, for example "we are meant to be together", gives `suspicious` and `generic` at most.
- `triệu để tham gia` (see "Changes") and `daily profit` can fire on ordinary business or class fees; they give `suspicious` at most.

## Error handling

No new failure mode: `TextAnalyzer` and the pipeline never reject. An unknown
monster id still falls back to `generic` in `chooseMonster` (REQ-PAGE-02), but
only for ids outside `MONSTER_PRESENTATION`; `investment` and `romance` are
inside it, so they reach `MONSTER_TEXT` (hence Q1).
