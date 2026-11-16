# Requirements Document

## Introduction

Every word the user reads should carry the Halloween horror theme, without
making a warning harder to understand. This spec sets a three-tier voice for
the English and Vietnamese dictionaries, a list of words that are never used,
the text that is never reworded, and automatic tests that keep it that way.

Steering: `.kiro/steering/halloween-voice.md`.

Numbering: new `REQ-VOICE-` series and `PBT-100` onward (last existing is `PBT-99`).

## Relationship to existing specs

`ui-presentation`, `ui-page` and `hunter-ui` are complete and are not reopened.
This spec changes only the wording of some dictionary strings (tiers A and B)
and adds tests. No key is renamed or removed, no component logic changes.

**Hard constraints** (unchanged):

- The risk-level wording in `privacy-and-safety.md` stays word for word. No result is called "safe", "clean" or "an toàn" (the one negated key `result.noSignals.notSafeNote` excepted).
- Every user-visible string is a dictionary key in `en` and `vi` with identical key sets. No hard-coded text in components.
- No change to `src/core`, `src/analyzers`, `src/pipeline`, `src/server`, `src/client`, `src/app/api` or the API contract. No new dependency.

## Glossary

- **Tier**: A, B or C. How much of the horror voice a string may use.
- **Horror word**: a word from the vocabulary list in `src/ui/i18n/voice.ts`.
- **Fixed text**: strings pinned word for word by a test.
- **Required-themed key**: a tier A key that must contain at least one horror word in both languages.

## Requirements

### Requirement 1: Tiers

1. **REQ-VOICE-01** Every dictionary key SHALL belong to exactly one tier, decided by `tierOf(key)` in `src/ui/i18n/voice.ts` from an ordered table of key patterns. A key that matches no pattern SHALL make a test fail.
2. **REQ-VOICE-02** Tier A (full horror voice) SHALL cover `app.tagline`, `scene.*`, `home.*`, `bag.*` except `bag.enter.hint`, `hunt.*`, `monster.*.name`, `monster.*.short`, `result.monster.heading`, `result.tips.heading`, `result.frame.label` and `journal.title`.
3. **REQ-VOICE-03** Tier B (meaning first) SHALL cover `input.*`, `progress.*`, `result.heading`, `result.message.*`, `result.signals.heading`, `result.evidence.*`, `result.limitations.heading`, `journal.*` except `journal.title` and `journal.do.heading`, and `settings.sound.*`. A tier B string SHALL contain at most one horror word.
4. **REQ-VOICE-04** Tier C (plain only) SHALL cover every other key, including `app.name`, `privacy.note`, `a11y.*`, `prefs.*`, `settings.open`, `topbar.*`, `result.meter.*`, `result.highlight.*`, `result.severity.*`, `result.actions.heading`, `journal.do.heading`, `result.aiNote.*`, `result.limitsNote`, `result.noSignals.*`, `result.tech.*`, `result.withheld`, `level.*`, `source.*`, `semantic.*`, `signal.*`, `monster.*.tip*`, `bag.enter.hint`, `notice.*` and `error.*`. A tier C string SHALL contain no horror word.

### Requirement 2: Fixed text

1. **REQ-VOICE-05** The following strings SHALL stay word for word, in both languages, and a test SHALL pin them: the four `level.*` labels, `result.actions.heading`, `journal.do.heading`, `result.limitsNote`, `result.noSignals.summary`, `result.noSignals.reminder`, `result.noSignals.reminderStrong`, `result.noSignals.notSafeNote`, `privacy.note`.

### Requirement 3: Words that are never used

1. **REQ-VOICE-06** No string, in any tier, SHALL contain a word about killing, blood, gore, corpses, death, torture or suicide; a religious or exorcism word; a too-strong fear word (doom, terror, terrifying, horrifying, deadly, evil, kinh hoàng); or a reassurance or absolute word (safe, clean, definitely, guaranteed, an toàn, chắc chắn 100%). The exact lists are in `voice.ts`. The only exception is the word "safe" and "an toàn" in `result.noSignals.notSafeNote`.
2. **REQ-VOICE-07** No string SHALL joke about the user's data, about victims, or insult the sender of a message. This is a writing rule, checked in review.

### Requirement 4: Themed wording

1. **REQ-VOICE-08** Each required-themed key SHALL contain at least one horror word in English and at least one in Vietnamese. The list is `REQUIRED_THEMED` in `voice.ts`: `app.tagline`, `scene.home.caption`, `scene.bag.caption`, `scene.hunt.forest`, `scene.hunt.mountain`, `scene.hunt.swamp`, `scene.hunt.ruins`, `scene.reveal.found`, `scene.reveal.nothing`, `scene.lost.caption`, `home.hunter.action`, `bag.heading`, `hunt.again`, `result.frame.label`, `result.monster.heading`, `result.tips.heading`, `journal.title`, and every `monster.*.name` and `monster.*.short`.
2. **REQ-VOICE-09** The dictionary SHALL use one term per idea (see the steering table): "hunt" for checking, "hunt report" or "journal" for the result, "the bag" for the input, "monster" for a scam type, "you" for the user.

### Requirement 5: Reading level

1. **REQ-VOICE-10** In tiers A and B a sentence SHALL have at most 18 words in English and 26 syllables in Vietnamese, and no word SHALL be longer than 14 letters. Placeholders such as `{name}` are not counted.

### Requirement 6: Accessibility and components

1. **REQ-VOICE-11** Accessible names (`aria-label`, `title`) SHALL say what the control does in plain words. A horror word is allowed only when the action stays clear.
2. **REQ-VOICE-12** Components, art, sound and the canvas SHALL carry no hard-coded words (existing rule). New text goes through the dictionary and gets a tier.

## Property-Based Testing

| ID | Property |
|---|---|
| **PBT-100** | Every key of `en` has exactly one tier, `vi` has the same key set, and the tier table has no unused rule (REQ-VOICE-01). |
| **PBT-101** | For every tier C key and both languages, the string has no horror word. The fixed text matches the pinned strings (REQ-VOICE-04, 05). |
| **PBT-102** | For every key and both languages, no banned word appears, except the one exempted key (REQ-VOICE-06). |
| **PBT-103** | For every tier A and B key and both languages, sentence length and word length are within the limits, and a tier B string has at most one horror word (REQ-VOICE-03, 10). |
| **PBT-104** | Every required-themed key has a horror word in English and in Vietnamese (REQ-VOICE-08). |

## Out of Scope

- Rewording tier C text (risk labels, actions, explanations, notices, errors).
- New art, sound or layout. Long monster descriptions only get a layout check.
- A third language.
