# Design Document

## Overview

One pure module, `src/ui/i18n/voice.ts`, holds the tier table, the word lists
and the checkers. Tests read the real dictionaries through it. Then the tier A
and B strings are rewritten in both languages. Nothing else changes.

## A. The module (`src/ui/i18n/voice.ts`)

```ts
export type VoiceTier = "A" | "B" | "C";
export function tierOf(key: string): VoiceTier | null;       // null: no rule matched
export const TIER_RULES: readonly { pattern: RegExp; tier: VoiceTier }[];
export const REQUIRED_THEMED: readonly string[];              // exact keys, plus the monster name/short keys
export const FIXED_TEXT: Readonly<Record<string, { en: string; vi: string }>>;

export function words(text: string): string[];                // lower-case letter runs, \p{L}+, NFC
export function countHorrorWords(text: string, lang: "en" | "vi"): number;
export function bannedWords(text: string, lang: "en" | "vi"): string[];
export function sentenceLengths(text: string): number[];      // words per sentence
export function longestWord(text: string): number;
```

- Text is lower-cased and normalized to NFC. Placeholders `{name}` are removed first.
- English tokens are runs of letters (`hunter's` gives `hunter`, `s`). `TrickHunt` is one token, so it never counts as "hunt".
- Vietnamese lists are phrases (`thợ săn`, `bóng tối`). They are matched longest first, without overlap, with a letter boundary on both sides, so `mã` is never read as `ma`.
- The Vietnamese verb "lần theo" is not a horror word. "dấu vết" is.

### Tier table (first match wins)

| Order | Pattern | Tier |
|---|---|---|
| 1 | `app.name`, `bag.enter.hint`, `monster.*.tip*` | C |
| 2 | `privacy.note`, `a11y.*`, `prefs.*`, `settings.open`, `topbar.*`, `result.meter.*`, `result.highlight.*`, `result.severity.*`, `result.actions.heading`, `journal.do.heading`, `result.aiNote.*`, `result.limitsNote`, `result.noSignals.*`, `result.tech.*`, `result.withheld`, `level.*`, `source.*`, `semantic.*`, `signal.*`, `notice.*`, `error.*` | C |
| 3 | `app.tagline`, `scene.*`, `home.*`, `bag.*`, `hunt.*`, `monster.*.name`, `monster.*.short`, `result.monster.heading`, `result.tips.heading`, `result.frame.label`, `journal.title` | A |
| 4 | `input.*`, `progress.*`, `result.heading`, `result.message.*`, `result.signals.heading`, `result.evidence.*`, `result.limitations.heading`, `journal.*`, `settings.sound.*` | B |

### Word lists

Horror words (all lower-case):

- **English:** ghost, ghosts, shadow, shadows, vampire, vampires, zombie, zombies, banshee, banshees, monster, monsters, hunter, hunters, hunt, lantern, candle, trail, forest, swamp, ruins, graveyard, grave, fog, mist, moon, night, dark, darkness, creep, creeps, creeping, lurk, lurks, lurking, wail, wails, wailing, haunt, haunts, haunted, curse, cursed, spooky, eerie.
- **Vietnamese:** bóng ma, ma cà rồng, xác sống, ma nữ, ma quái, quái vật, thợ săn, ngọn đèn, ngọn nến, dấu vết, đầm lầy, tàn tích, nghĩa địa, bóng tối, lởn vởn, gào khóc, lời nguyền, bóng, ma, đèn, nến, rừng, sương, trăng, đêm, săn.

Banned words:

- **English:** kill, kills, killed, killing, murder, blood, bloody, gore, corpse, corpses, death, dead, die, dies, died, torture, suicide, satan, devil, hell, demon, demons, exorcism, doom, doomed, terror, terrifying, horrifying, deadly, evil, safe, clean, definitely, guaranteed.
- **Vietnamese:** giết, máu, xác chết, tử thần, chết, tra tấn, tự tử, quỷ dữ, ác quỷ, địa ngục, kinh hoàng, an toàn, chắc chắn 100%.
- Exempt: `result.noSignals.notSafeNote` (the words "safe" and "an toàn").

### Fixed text

`FIXED_TEXT` copies the current strings of: `level.no_signals`, `level.suspicious`, `level.high`, `level.critical`, `result.actions.heading`, `journal.do.heading`, `result.limitsNote`, `result.noSignals.summary`, `result.noSignals.reminder`, `result.noSignals.reminderStrong`, `result.noSignals.notSafeNote`, `privacy.note`.

## B. Rewritten strings

Only these keys change (key names do not change). Everything else stays.

### Tier A

| Key | English | Vietnamese |
|---|---|---|
| `app.tagline` | Before you reply, send the hunter into the dark after that strange message. | Trước khi trả lời, hãy nhờ bác thợ săn vào bóng tối lần theo tin nhắn lạ ấy. |
| `scene.bag.caption` | What shall the hunter track in the dark? Put a message, a picture, or both in the bag. | Bác thợ săn sẽ lần theo gì trong bóng tối? Hãy bỏ tin nhắn, hình ảnh hoặc cả hai vào túi. |
| `scene.hunt.forest` | The hunter creeps into the dark forest… | Bác thợ săn rón rén vào khu rừng tối… |
| `scene.hunt.mountain` | He climbs the cold mountain pass, lantern held high… | Ông leo lên đèo núi lạnh, giơ cao ngọn đèn… |
| `scene.hunt.swamp` | He wades through the swamp fog, reading the strange marks… | Ông lội qua đầm lầy đầy sương, xem kỹ những ký hiệu lạ… |
| `scene.hunt.ruins` | The old ruins ahead. Something moves in the shadows. He takes aim… | Tàn tích cũ phía trước. Có thứ gì đó cựa quậy trong bóng tối. Ông nhắm bắn… |
| `result.monster.heading` | The monster behind this trick | Con quái vật đứng sau chiêu trò này |
| `result.tips.heading` | How to spot this monster | Cách nhận ra con quái vật này |
| `monster.bank.short` | A ghost in a banker's coat. It haunts your phone and wants your code, password or card number. | Bóng ma khoác áo ngân hàng, lởn vởn trong điện thoại của bạn để đòi mã, mật khẩu hoặc số thẻ. |
| `monster.prize.short` | A vampire with a gift box. It drinks your money and your details. | Ma cà rồng cầm hộp quà. Nó hút cạn tiền và thông tin của bạn. |
| `monster.job-bait.short` | A zombie that crawls out of the graveyard with an easy job. It wants your deposit or details. | Xác sống bò ra từ nghĩa địa với việc nhẹ lương cao. Nó muốn tiền cọc hoặc thông tin của bạn. |
| `monster.authority.short` | A banshee that wails in an officer's cap. It frightens you into obeying. | Ma nữ gào khóc đội mũ công an. Nó dọa bạn phải làm theo. |
| `monster.generic.short` | A shadow creeping in the fog. It shows warning signs, but its face is unknown. | Một cái bóng len lỏi trong sương. Nó có dấu hiệu lạ nhưng chưa rõ mặt. |
| `monster.neutral.short` | A candle burning low in the dark. No signs yet, but keep watch. | Ngọn nến leo lét trong bóng tối. Chưa thấy dấu hiệu nào, nhưng hãy cứ canh chừng. |

### Tier B

| Key | English | Vietnamese |
|---|---|---|
| `input.empty` | Put a message or a picture in the bag to start the hunt. | Hãy bỏ tin nhắn hoặc hình ảnh vào túi để bắt đầu cuộc săn. |
| `progress.preparing` | Lighting the lantern and getting the image ready… | Đang thắp đèn và chuẩn bị ảnh… |
| `progress.qr` | Searching the dark for a QR code… | Đang tìm mã QR trong bóng tối… |
| `progress.ocr.loading` | Waking the text reader… | Đang đánh thức công cụ đọc chữ… |
| `progress.ocr.recognizing` | Reading the strange marks in the image: {percent}% | Đang đọc những ký hiệu lạ trong ảnh: {percent}% |
| `progress.sending` | Following the trail of warning signs… | Đang lần theo dấu vết cảnh báo… |
| `progress.done` | The hunt is over. Your report is ready. | Cuộc săn đã xong. Báo cáo đã sẵn sàng. |
| `progress.nothing` | The bag is empty. Add a message or an image. | Túi đang trống. Hãy thêm tin nhắn hoặc ảnh. |
| `result.heading` | Your hunt report | Báo cáo cuộc săn của bạn |
| `result.message.heading` | The message you gave the hunter | Tin nhắn bạn đưa cho bác thợ săn |
| `result.message.note` | Highlighted parts are where the hunter found a warning sign. | Phần được tô sáng là chỗ bác thợ săn thấy dấu hiệu lạ. |
| `result.signals.heading` | Why the hunter is cautious | Vì sao bác thợ săn thấy lạ |
| `result.evidence.label` | What the hunter saw: | Bác thợ săn thấy: |
| `result.evidence.heading` | What the hunter found | Bác thợ săn tìm thấy gì |
| `settings.sound.label` | Spooky sound | Âm thanh ma quái |

## C. Tests

| File | Covers |
|---|---|
| `voice.test.ts` | `tierOf`, `words`, `countHorrorWords` (longest match, `mã` is not `ma`, `TrickHunt` is not `hunt`), `bannedWords`, `sentenceLengths`, `longestWord`; the fixed text equals the dictionaries |
| `voice.property.test.ts` | PBT-100 to PBT-104 over the real `en` and `vi` |

## D. Risks

- Longer monster descriptions can wrap on small phones. Mitigation: a screenshot check at 320 to 1440 px.
- Pinned English strings in tests and e2e (for example "Ambient sound") change. Mitigation: use `t()` in tests; update the few literals.
- A horror word can sneak into a tier C string later. Mitigation: PBT-101 fails.
