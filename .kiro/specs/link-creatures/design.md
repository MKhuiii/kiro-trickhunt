# Design: Link creatures

## Files

| File | Change |
|---|---|
| `src/ui/link-creatures.ts` | New. `LinkTone`, `LinkCreatureId`, `LinkCreature`, `LINK_CREATURES`, `LINK_TONES`. Imports only types. |
| `src/ui/view/link-creatures-view.ts` | New. `buildLinkCreatures(signals: unknown): LinkCreatureView[]`, pure and total. |
| `src/ui/view/result-view.ts` | Edited. `ReadyResultView.linkCreatures`; one call to `buildLinkCreatures(signals)`. No other line of the old logic changes. |
| `src/ui/i18n/en.ts`, `vi.ts` | New `link.*` keys (below). |
| `src/ui/i18n/voice.ts` | Add `link\.` to the tier C prefix rule. |
| `src/ui/theme/palettes.ts` | Seven tokens in `COLOR_TOKENS` and both palettes. |
| `src/ui/theme/pairs.ts` | `LINK_TOKENS` list, 14 `text` pairs on `CARD_SURFACES`. |
| `src/ui/index.ts` | Exports (REQ-LINK-08). |
| `README.md` | One section (REQ-LINK-20). |

## Derivation (REQ-LINK-09 to REQ-LINK-12)

`buildResultView` already has the cleaned `signals` array. `buildLinkCreatures`:

1. Keep signals with `source === "url"`, a string `id` found in `LINK_CREATURES` by `signalId`, and `shortEvidence(evidence) !== ""`.
2. Group by creature. `signalIds` = unique ids in verdict order. `evidence` = `shortEvidence` of the first signal in verdict order. `severity` = highest finite `severity`, else 0.
3. Sort by severity descending, then by index in `LINK_CREATURES`. The sort is stable and uses only these two keys, so the output depends only on the url signals.
4. Wrapped in `try/catch`; a failure gives `[]`.

Evidence formats from the analyzer (for reference, `shortEvidence` cuts to 80 code points):
`url.punycode-host` and `url.ip-address-host` give the hostname; `url.at-in-authority` gives the user-info part before `@`; `url.excessive-subdomains` gives `host (N parts)`; `url.known-shortener` gives the matched domain; `url.brand-lookalike` gives `stem looks like brand (edit distance N)`; `url.credential-keywords` gives `kw1, kw2 in path /path`. Analyzer severities are 0.8, 0.9, 0.7, 0.5, 0.4, 0.75 and 0.45 in the order above; they set the order of the list, not the tone band.

## Table

| Creature | `signalId` | `colorToken` | `artKey` | Tone |
|---|---|---|---|---|
| doppelganger | `url.brand-lookalike` | `link-doppelganger` | `creature-doppelganger` | strong |
| changeling | `url.punycode-host` | `link-changeling` | `creature-changeling` | strong |
| faceless-one | `url.ip-address-host` | `link-faceless-one` | `creature-faceless-one` | strong |
| masked-stranger | `url.at-in-authority` | `link-masked-stranger` | `creature-masked-stranger` | strong |
| hydra | `url.excessive-subdomains` | `link-hydra` | `creature-hydra` | medium |
| cloaked-gate | `url.known-shortener` | `link-cloaked-gate` | `creature-cloaked-gate` | soft |
| wisp | `url.credential-keywords` | `link-wisp` | `creature-wisp` | soft |

Tone bands: `strong` label key `link.tone.strong.label`, icon `icon-tone-strong`; `medium`, icon `icon-tone-medium`; `soft`, icon `icon-tone-soft`.

## Colors (REQ-LINK-15, REQ-LINK-16)

Ratios are measured on `surface` and `raised` with the WCAG formula. Normal needs 4.5. High contrast needs 7.

| Token | Normal | on surface / raised | High contrast | on surface / raised |
|---|---|---|---|---|
| `link-doppelganger` | `#6FE0D2` | 9.86 / 8.06 | `#8FEBDF` | 14.43 / 13.50 |
| `link-changeling` | `#C9A6FF` | 7.71 / 6.31 | `#DBC4FF` | 12.74 / 11.92 |
| `link-faceless-one` | `#E8E2C4` | 11.96 / 9.78 | `#F3EFD9` | 17.33 / 16.22 |
| `link-masked-stranger` | `#FFB37A` | 8.90 / 7.28 | `#FFC9A0` | 13.47 / 12.61 |
| `link-hydra` | `#8EE8A0` | 10.55 / 8.62 | `#A9F0B8` | 15.12 / 14.15 |
| `link-cloaked-gate` | `#9FB8FF` | 8.00 / 6.54 | `#BCCEFF` | 12.80 / 11.98 |
| `link-wisp` | `#F5A6C8` | 8.30 / 6.78 | `#FFBFD9` | 13.08 / 12.24 |

## Voice tier

All `link.*` keys are tier C. The names are plain nouns with no horror word, the other texts explain a warning sign and a next step, and the steering file says such explanations are always tier C. The tier C rule stays "no horror word", so the texts below avoid ghost, shadow, dark, trail, hunter and similar words.

## Dictionary text

Vietnamese is a draft, pending human review (REQ-UI-07). Tests do not pin it.

### Names

| Id | English | Vietnamese (draft) |
|---|---|---|
| doppelganger | Doppelganger | Kẻ Song Trùng |
| changeling | Changeling | Kẻ Đổi Hình |
| faceless-one | Faceless One | Kẻ Không Mặt |
| masked-stranger | Masked Stranger | Người Lạ Đeo Mặt Nạ |
| hydra | Hydra | Rắn Nhiều Đầu |
| cloaked-gate | Cloaked Gate | Cổng Áo Choàng |
| wisp | Wisp | Đốm Sáng Lạ |

### Descriptions (`link.<id>.desc`)

| Id | English | Vietnamese (draft) |
|---|---|---|
| doppelganger | This link has traits of a lookalike: its name is very close to a well-known brand. | Đường dẫn này có dấu hiệu của một tên bắt chước: tên rất giống một thương hiệu quen thuộc. |
| changeling | This link has traits of a disguised name: it uses unusual letters that look like normal ones. | Đường dẫn này có dấu hiệu của một tên đội lốt: dùng chữ lạ trông giống chữ thường. |
| faceless-one | This link has traits of a hidden name: it is a string of numbers, not a site name. | Đường dẫn này có dấu hiệu của một tên bị giấu: chỉ là một dãy số, không phải tên trang. |
| masked-stranger | This link has traits of a hidden destination: an @ sign can put the real site after it. | Đường dẫn này có dấu hiệu che nơi đến: dấu @ có thể khiến trang thật nằm sau nó. |
| hydra | This link has traits of a stretched name: many parts can push the real site name out of sight. | Đường dẫn này có dấu hiệu của một tên bị kéo dài: nhiều phần có thể che mất tên trang thật. |
| cloaked-gate | This link has traits of a hidden destination: it is a short link, so you cannot see where it goes. | Đường dẫn này có dấu hiệu che nơi đến: đây là đường dẫn rút gọn nên bạn không thấy nó dẫn đi đâu. |
| wisp | This link has traits of a sign-in page: it contains words like login or verify. | Đường dẫn này có dấu hiệu của một trang đăng nhập: có những từ như login hoặc verify. |

### Tips (`link.<id>.tip1` to `tip3`)

| Id | Key | English | Vietnamese (draft) |
|---|---|---|---|
| doppelganger | tip1 | Read the name letter by letter. Look for swapped or extra letters. | Đọc tên từng chữ cái. Tìm chữ bị đổi chỗ hoặc thêm vào. |
| | tip2 | Compare it with the address in the brand's official app or on its card. | So với địa chỉ trong ứng dụng chính thức hoặc trên thẻ của thương hiệu. |
| | tip3 | Do not open it. Type the brand's address yourself. | Đừng mở đường dẫn. Hãy tự gõ địa chỉ của thương hiệu. |
| changeling | tip1 | Letters from other alphabets can look the same as English letters. | Chữ của bảng chữ cái khác có thể trông giống chữ quen thuộc. |
| | tip2 | An address that starts with xn-- hides letters like these. | Địa chỉ bắt đầu bằng xn-- có che các chữ như vậy. |
| | tip3 | Do not open it. Find the real site through the official app. | Đừng mở đường dẫn. Hãy tìm trang thật qua ứng dụng chính thức. |
| faceless-one | tip1 | Numbers stand where a site name should be. | Một dãy số nằm ở chỗ đáng lẽ là tên trang. |
| | tip2 | Well-known companies rarely send people to an address made only of numbers. | Các công ty lớn hiếm khi gửi người dùng đến địa chỉ chỉ có số. |
| | tip3 | Do not open it. Contact the sender through a number you already trust. | Đừng mở đường dẫn. Hãy liên lạc với người gửi qua số bạn đã biết. |
| masked-stranger | tip1 | The part before the @ sign is not the site. | Phần trước dấu @ không phải là trang đích. |
| | tip2 | Look at the part after the @ sign. Does it match who sent the message? | Nhìn phần sau dấu @. Nó có khớp với người gửi không? |
| | tip3 | Do not open it. Ask the sender for the plain address. | Đừng mở đường dẫn. Hãy xin người gửi địa chỉ rõ ràng. |
| hydra | tip1 | Read the address from the right. The last two parts usually name the real site. | Đọc địa chỉ từ phải sang trái. Hai phần cuối thường là tên trang thật. |
| | tip2 | A brand name near the start does not mean the site belongs to that brand. | Tên thương hiệu ở đầu không có nghĩa trang thuộc về thương hiệu đó. |
| | tip3 | If you are unsure, type the brand's address yourself. | Nếu chưa chắc, hãy tự gõ địa chỉ của thương hiệu. |
| cloaked-gate | tip1 | A short link hides the full address. | Đường dẫn rút gọn giấu địa chỉ đầy đủ. |
| | tip2 | Ask the sender for the full address. | Hãy hỏi người gửi địa chỉ đầy đủ. |
| | tip3 | If the page asks for a password or money, stop and use the official app instead. | Nếu trang đòi mật khẩu hoặc tiền, hãy dừng lại và dùng ứng dụng chính thức. |
| wisp | tip1 | Words like login, verify or password in a link are a reason to slow down. | Từ như login, verify hay password trong đường dẫn là lý do để chậm lại. |
| | tip2 | Reach a sign-in page through the official site or app. | Hãy vào trang đăng nhập qua trang hoặc ứng dụng chính thức. |
| | tip3 | Do not enter a password on a page that a message sent you to. | Đừng nhập mật khẩu vào trang mà một tin nhắn đã dẫn bạn đến. |

### Tone labels and link-explanation lines (`link.tone.<band>.label`, `.explain`)

| Band | Key | English | Vietnamese (draft) |
|---|---|---|---|
| strong | label | Strong sign | Dấu hiệu mạnh |
| strong | explain | This link has traits that are often used to hide where it really goes. Do not open it. Contact the sender another way. | Đường dẫn này có dấu hiệu thường dùng để che nơi nó thật sự dẫn đến. Đừng mở nó. Hãy liên lạc với người gửi bằng cách khác. |
| medium | label | Medium sign | Dấu hiệu vừa |
| medium | explain | This link has traits that can make the address hard to read. Check it before you trust it. | Đường dẫn này có dấu hiệu khiến địa chỉ khó đọc. Hãy kiểm tra trước khi tin. |
| soft | label | Mild sign | Dấu hiệu nhẹ |
| soft | explain | This link has a trait that shows up in scams and in normal messages. Take a moment to check it. | Đường dẫn này có một dấu hiệu gặp cả trong lừa đảo lẫn tin nhắn bình thường. Hãy dành một chút để kiểm tra. |

## README section (REQ-LINK-20)

```md
## Link creatures

Each suspicious trait in a link gets a small creature on the result card. For example, the Doppelganger marks a name that is very close to a well-known brand. Creatures only help you read the evidence. They never change the risk level, the score or the main monster. TrickHunt never opens, visits or tests a link, so it cannot tell whether a link exists, where it leads or whether the page behind it is genuine. It only looks at the characters of the link.
```

## Test files

`src/ui/link-creatures.test.ts` (table, one-to-one with the analyzer, bands, real `UrlAnalyzer` samples),
`src/ui/view/link-creatures-view.test.ts` (examples), `src/ui/view/link-creatures-view.property.test.ts` (PBT-105 to PBT-107, with the old projection copied in the test),
`src/ui/i18n/link-creatures.property.test.ts` (PBT-108), `src/ui/theme/link-creatures.contrast.property.test.ts` (PBT-109).
