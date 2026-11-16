---
inclusion: fileMatch
fileMatchPattern: "src/{ui,components,app}/**"
---
# Halloween voice

Applies to every user-visible string (the English and Vietnamese dictionaries
`src/ui/i18n/en.ts` and `vi.ts`) and to the wording of new components (spec
`halloween-voice`). The words carry the Halloween horror theme, but the
meaning of a warning must never get harder to understand.

The risk-level wording in `privacy-and-safety.md` and the rules in `ui-rules.md`
stay above this file. If they conflict, they win.

## Three tiers

Every dictionary key belongs to exactly one tier. `src/ui/i18n/voice.ts` holds
the table (by key prefix) and a test fails for a key that has no tier.

| Tier | Rule | Keys |
|---|---|---|
| **A. Full horror voice** | Free use of the horror vocabulary below. Dark folk-horror tone: shadows, fog, graveyard, wailing, curses | `app.tagline`, `scene.*`, `home.*`, `bag.*` (not `bag.enter.hint`), `hunt.*`, `monster.*.name`, `monster.*.short`, `result.monster.heading`, `result.tips.heading`, `result.frame.label`, `journal.title` |
| **B. Meaning first** | The sentence must be plain. At most **one** horror word, from the light group (lantern, dark, trail, hunter, hunt, bag, spooky) | `input.*`, `progress.*`, `result.heading`, `result.message.*`, `result.signals.heading`, `result.evidence.*`, `result.limitations.heading`, `journal.*` (except `journal.title`, `journal.do.heading`), `settings.sound.*` |
| **C. Plain only** | **No** horror words. Short, calm, one clear action | Everything else: `app.name`, `privacy.note`, `a11y.*`, `prefs.*`, `settings.open`, `topbar.*`, `result.meter.*`, `result.highlight.*`, `result.severity.*`, `result.actions.heading`, `journal.do.heading`, `result.aiNote.*`, `result.limitsNote`, `result.noSignals.*`, `result.tech.*`, `result.withheld`, `level.*`, `source.*`, `semantic.*`, `signal.*`, `monster.*.tip*`, `bag.enter.hint`, `notice.*`, `error.*` |

New keys: put them under a prefix that already has the right tier, or add a
rule to `voice.ts` and say which tier and why. Explanations of a warning sign,
what to do, risk labels, notices and errors are always tier C.

## Fixed text (never reworded)

These are pinned word for word in both languages by a test: the four `level.*`
labels, `result.actions.heading`, `journal.do.heading`, `result.limitsNote`,
`result.noSignals.summary`, `.reminder`, `.reminderStrong`, `.notSafeNote`, and
`privacy.note`. Changing one needs a spec change first.

## Horror vocabulary (simple words only)

- **English:** ghost, shadow, vampire, zombie, banshee, monster, hunter, lantern, candle, trail, forest, swamp, ruins, graveyard, grave, fog, mist, moon, night, dark, creep, lurk, wail, haunt, curse, spooky, eerie.
- **Vietnamese:** ma, bóng ma, bóng, ma cà rồng, xác sống, ma nữ, quái vật, thợ săn, ngọn đèn, đèn, ngọn nến, nến, dấu vết, rừng, đầm lầy, tàn tích, nghĩa địa, sương, trăng, đêm, bóng tối, lởn vởn, gào khóc, lời nguyền, ma quái, săn.

## Never write (any tier)

- Killing, blood, gore, corpses, death, torture, suicide (kill, murder, blood, gore, corpse, death, dead, die, torture, suicide; giết, máu, xác chết, tử thần, chết, tra tấn, tự tử).
- Religion and exorcism (satan, devil, hell, demon, exorcism; quỷ dữ, ác quỷ, địa ngục).
- Fear words that are too strong (doom, terror, terrifying, horrifying, deadly, evil; kinh hoàng).
- Reassurance or absolute claims (safe, clean, definitely, guaranteed; an toàn, chắc chắn 100%). The one existing negated sentence `result.noSignals.notSafeNote` is the only exception.
- Jokes about the user's data (never "buried", "eaten", "haunted" for stored data), about victims, or insults to the sender of a message.
- Old or hard words (no "thee", "behold", "alas", "macabre", "eldritch"), and any word longer than 14 letters.

## Terms (one word per idea)

| Idea | English | Vietnamese |
|---|---|---|
| Check a message | hunt, track | săn, lần theo |
| The result | hunt report, journal | báo cáo cuộc săn, nhật ký |
| A warning sign | warning sign (tiers A and B may say "trail" or "marks") | dấu hiệu cảnh báo (A, B: "dấu vết", "ký hiệu lạ") |
| The user | you | bạn |
| The hunter | the hunter, he | bác thợ săn, ông |
| The input box | the bag | cái túi, túi |
| A scam type | monster, trick | quái vật, chiêu trò |

## Length and reading level (tiers A and B)

- At most 18 words per sentence in English and 26 syllables per sentence in Vietnamese.
- One idea per sentence. The meaning comes before the mood.
- Vietnamese uses the same keys and the same tier. It needs at least one Vietnamese horror word wherever the English has one in a required-themed key (the list is in `voice.ts`).

## Components

- No hard-coded text in components (already a rule). Accessible names (`aria-label`, `title`) say what the control does in plain words; a horror word is fine only when the action stays clear ("Open the hunter's bag").
- Art, sound and the canvas carry no words.
- When the horror voice and a clear warning disagree, the clear warning wins.
