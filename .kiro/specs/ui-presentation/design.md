# Design Document

## Overview

A pure TypeScript layer in `src/ui/` that components will render without any
logic of their own. Input: `Verdict`, `AnalyzeClientResult`, `IngestResult`,
`BuildAnalyzeResult`. Output: dictionary keys, params and plain view models.
No component, style, SVG or animation is defined here.

**Language policy (English-first amendment).** English is the primary UI
language and the source of every string; Vietnamese is secondary and a draft
pending human review. `DEFAULT_LOCALE` is `"en"`. Nothing detects the browser
language: with no valid saved preference the language is always `"en"`. The
pipeline, analyzers and API are unchanged; only `src/ui/` and its spec change.

Verified against the code in this repository (nothing here was assumed):

- **Verdict** (`src/pipeline/verdict.ts`): `riskScore` 0..100, `level`
  (`no_signals | suspicious | high | critical`), `monster` is `null` exactly when
  level is `no_signals`, `signals` sorted by severity, `actions` and
  `limitations` are already localized by the `locale` sent in the request,
  `semantic { status: ok | unavailable | degraded, reason?, skipped }`,
  `inputTruncated`, `urlsAnalyzed`, `urlsSkipped`.
- **Monster ids**: `bank`, `prize`, `job-bait`, `authority` (from `MONSTERS` in
  `monsters.config.ts`) and `generic` (`GENERIC`). The `gift vampire` is `prize`
  and the `job zombie` is `job-bait`.
- **Signal ids** (21): 8 `text.*` (`otp-request`, `urgency`, `threat`,
  `prize-reward`, `payment-request`, `authority-impersonation`, `off-platform`,
  `sensitive-data-request`), 7 `url.*` (`punycode-host`, `ip-address-host`,
  `at-in-authority`, `excessive-subdomains`, `known-shortener`, `brand-lookalike`,
  `credential-keywords`; these are only in `url-analyzer.ts`, there is no config
  list) and 6 `semantic.*` (`impersonation-tone`, `emotional-manipulation`,
  `too-good-to-be-true`, `isolation-secrecy`, `relationship-or-job-bait`,
  `pressure-escalation`). `SignalSource` allows `image` and `qr`, but no analyzer
  emits them today; the view still orders them.
- **What `Signal.evidence` really contains** (this drives highlighting):
  - `TextAnalyzer`: the matched config phrases as written in the config
    (lower case, with Vietnamese accents), joined with `", "`, cut at 200
    characters. Matching in the analyzer ignores case, accents and punctuation,
    so the original text can differ from the phrase.
  - `UrlAnalyzer`: `punycode-host`, `ip-address-host`, `known-shortener` give the
    host or shortener domain; `at-in-authority` gives `user[:pw]@host`;
    `excessive-subdomains` gives `host (N parts)`; `brand-lookalike` gives
    `stem looks like brand (edit distance N)`; `credential-keywords` gives
    `kw1, kw2 in path /path`. Hosts are lower-cased by normalization.
  - `SemanticAnalyzer`: a substring of the redacted text, so it can contain
    `[EMAIL]`, `[PHONE]` or `[NUMBER]` and then does not occur in the user's text.
  - The pipeline cuts evidence to 200 characters.
- **`Signal.whyItMatters`** is English only and is not displayed by this layer.
- **API contract** (`analyze-client.ts`, `analyze-response.ts`): error codes
  `invalid-content-type`, `payload-too-large`, `invalid-input`, `rate-limited`,
  `internal-error` from the server, plus client codes `network-error`, `timeout`,
  `bad-response`, `unexpected-status`. `rate-limited` carries `retryAfterSec`
  (1..3600, default 30). `locale` is an optional request field (`vi`/`en`).
  `meta.semanticMode` is `used | budget-exhausted | not-configured | skipped`.
  Budget exhaustion makes the pipeline see a client that throws, so
  `verdict.semantic` is `degraded / client-error`; no client gives
  `unavailable`; a blank text, a critical rule result or only URLs gives
  `skipped`. The mode is therefore more precise than the verdict, and wins.
- **Ingest** (`src/client/ingest`): `ingestImage` returns `{ ocrText?,
  qrResults, notices, errorCode? }`; notice kinds `ocr-skipped`, `ocr-too-poor`,
  `ocr-failed`; `errorCode` is set only when no text and no QR came out; codes
  are `unsupported-type`, `invalid-size`, `file-too-large`, `decode-failed`,
  `too-many-pixels`, `canvas-unavailable`, `ocr-engine-unavailable`,
  `ocr-timeout`, `ocr-aborted`, `ocr-failed`, `qr-engine-unavailable`,
  `qr-decode-failed`, `unexpected`. `buildAnalyzeRequest` adds notice kinds
  `payment-qr`, `wifi-qr`, `no-url`, `text-truncated`, and the text it returns
  in `request.text` is the user text and OCR text merged and cut to 4000
  characters. That is the `inputText` for `buildResultView`.
- **Temporary page** `src/app/try/page.tsx`: English only, prints raw JSON and
  raw codes, and does not send `locale`. Note for the next spec (no API change
  now): the real UI passes the current language preference, which is `"en"` by
  default, to `buildAnalyzeRequest({ locale })`, so `POST /api/analyze` receives
  `locale: "en"` and returns English actions and limitations. The page is
  replaced later and is not changed here.
- **Steering**: `ui-rules.md` is the main source of rules. `verdict-rules.md` is
  an empty file, so nothing is taken from it.
- `Locale` is defined in `src/pipeline/verdict.ts`; `MAX_IMAGE_BYTES`,
  `DEFAULT_RETRY_AFTER_SEC` and `MAX_RETRY_AFTER_SEC` are in the import-free
  `ingest.config.ts`.

Known limitation: if the user changes the UI language after a result, the
verdict's `actions` and `limitations` stay in the language of the request. All
other text is resolved at render time from keys and switches immediately.
Re-running is out of scope.

## Module layout (`src/ui/`)

```
i18n/en.ts, vi.ts        const tables; en (primary, written first) defines MessageKey, vi (draft) is Record<MessageKey,string>
i18n/dictionary.ts       DEFAULT_LOCALE = "en", t(), placeholder helpers
i18n/signal-ids.ts       KNOWN_SIGNAL_IDS (21), explanationKeyFor(id)
i18n/messages.ts         analyzeErrorMessage, ingestErrorMessage, noticeMessage
monsters.ts              MonsterKey, MONSTER_PRESENTATION
theme/palettes.ts        NORMAL_PALETTE, HIGH_CONTRAST_PALETTE, ColorToken
theme/contrast.ts        contrastRatio
theme/pairs.ts           DECLARED_PAIRS
theme/levels.ts          LEVEL_PRESENTATION
view/folding.ts          foldWithMap (Folded_Text)
view/highlights.ts       computeHighlights
view/evidence.ts         evidenceNeedles, shortEvidence
view/semantic-note.ts    semanticNoteKey
view/notices.ts          buildNotices
view/result-view.ts      buildResultView, ResultView types
preferences.ts           the only file that mentions localStorage
index.ts                 public exports
```

Every module has a `*.test.ts` next to it; properties are in
`*.property.test.ts`. Imports are relative. Type imports only from
`../pipeline` and `../client/ingest`; the one runtime import from the ingest
folder is `../client/ingest/ingest.config`.

## Dictionary

```ts
export const DEFAULT_LOCALE = "en" as const;
export const en = { "app.name": "TrickHunt", /* ... */ } as const;   // source language
export type MessageKey = keyof typeof en;
export const vi: Record<MessageKey, string> = { /* ... */ };          // draft translation
export type Params = Readonly<Record<string, string | number>>;

export function t(locale: unknown, key: MessageKey, params?: Params): string {
  // table = locale === "vi" ? vi : en   (anything else is DEFAULT_LOCALE)
  // text = table[key] ?? en[key] ?? ""
  // one pass: text.replace(/\{([A-Za-z0-9_]+)\}/g, (_, name) => String(params?.[name] ?? ""))
}
```

`en` is written first and defines the key set. `vi` typed as
`Record<MessageKey, string>` makes a missing or extra key a compile error;
PBT-70 checks it again at runtime. A single `replace` pass means param values
are not expanded again. Own-property checks (`Object.hasOwn`) are used for
`params` and tables so `__proto__` or `constructor` are never keys.
`DEFAULT_LOCALE` is the only place that names the default language; there is no
language detection anywhere in `src/ui/` (see Preferences).
Placeholders used: `{percent}`, `{seconds}`, `{maxMb}`, `{count}`, `{level}`, `{code}`.

`KNOWN_SIGNAL_IDS` is a constant list. A test checks that it equals the union of
`TEXT_PATTERNS` ids, `SEMANTIC_SIGNALS` ids and the `id: "url.…"` literals read
from `url-analyzer.ts` source, and that every id used in `MONSTERS` weights is in it.

### Wording rules (English is the reference)

- Short sentences (at most 25 words), everyday words, no jargon. "Code" is used
  for one-time passwords; the letters "OTP" are avoided in English text.
- Calm tone: describe what the message does, never accuse a person. Wherever a
  warning is shown, the text points to a next step ("Call the official number
  yourself").
- Signal explanations keep the meaning of the analyzers' `whyItMatters` but are
  shorter and add a next step. They are not copied from the server text.
- Level labels follow `privacy-and-safety.md`. The word "safe" / "an toàn"
  appears only in `result.noSignals.notSafeNote`, in a negated sentence.
- Each monster has a name, one short description and three recognition tips.
- `vi` follows the same keys and meaning. It is a draft translation, not
  polished in this spec.

### Review table

**English** is the primary text. **Every `vi` value below is a draft, pending
human review.** Tests check structure, never exact `vi` wording, so the
Vietnamese can be reworded without changing tests. Tick off a row in your own
review notes when its Vietnamese is approved.

`result.noSignals.notSafeNote` is the only key allowed to contain "safe" /
"an toàn", and only after a negation ("not" / "không"). Its English text says
explicitly that no warning signs does not mean the message is genuine.

#### App, input, progress, privacy

| Key | en (primary) | vi (draft, pending human review) |
|---|---|---|
| `app.name` | TrickHunt | TrickHunt |
| `app.tagline` | Check a strange message before you reply. | Kiểm tra tin nhắn lạ trước khi bạn trả lời. |
| `input.text.label` | Paste the message or link you want to check | Dán tin nhắn hoặc đường dẫn cần kiểm tra |
| `input.text.hint` | You can paste the whole message. We will find any links in it. | Bạn có thể dán cả tin nhắn. Chúng tôi sẽ tự tìm đường dẫn trong đó. |
| `input.image.label` | Choose a screenshot or QR code image | Chọn ảnh chụp màn hình hoặc mã QR |
| `input.image.hint` | You can also drop an image here or paste one. | Bạn cũng có thể kéo ảnh vào đây hoặc dán ảnh. |
| `input.image.selected` | One image selected. | Đã chọn một ảnh. |
| `input.image.remove` | Remove the selected image | Bỏ ảnh đã chọn |
| `input.submit` | Check | Kiểm tra |
| `input.reset` | Check another message | Kiểm tra tin khác |
| `input.empty` | Paste a message or choose an image to start. | Hãy dán tin nhắn hoặc chọn một ảnh để bắt đầu. |
| `progress.preparing` | Getting the image ready… | Đang chuẩn bị ảnh… |
| `progress.qr` | Looking for a QR code… | Đang tìm mã QR… |
| `progress.ocr.loading` | Loading the text reader… | Đang tải công cụ đọc chữ… |
| `progress.ocr.recognizing` | Reading the text in the image: {percent}% | Đang đọc chữ trong ảnh: {percent}% |
| `progress.sending` | Looking for warning signs… | Đang tìm các dấu hiệu cảnh báo… |
| `progress.done` | Your result is ready. | Đã có kết quả. |
| `progress.nothing` | There is nothing to check. Add a message or an image. | Không có gì để kiểm tra. Hãy thêm tin nhắn hoặc ảnh. |
| `privacy.note` | Your image never leaves your device. Only text and links are sent to be checked, and we do not store them. | Ảnh của bạn không rời khỏi máy. Chỉ chữ và đường dẫn được gửi đi để kiểm tra, và chúng tôi không lưu lại. |
| `a11y.skip` | Skip to main content | Đến nội dung chính |
| `a11y.result-ready` | Result ready: {level} | Đã có kết quả: {level} |

#### Preferences

| Key | en (primary) | vi (draft, pending human review) |
|---|---|---|
| `prefs.heading` | Settings | Tùy chỉnh |
| `prefs.language` | Language | Ngôn ngữ |
| `prefs.language.vi` | Tiếng Việt | Tiếng Việt |
| `prefs.language.en` | English | English |
| `prefs.textSize` | Text size | Cỡ chữ |
| `prefs.textSize.100` | Normal | Chữ thường |
| `prefs.textSize.125` | Large | Chữ lớn |
| `prefs.textSize.150` | Extra large | Chữ rất lớn |
| `prefs.reduceMotion` | Reduce motion | Giảm chuyển động |
| `prefs.highContrast` | High contrast | Tương phản cao |

#### Result, levels, sources, semantic notes

| Key | en (primary) | vi (draft, pending human review) |
|---|---|---|
| `result.heading` | Your result | Kết quả kiểm tra |
| `result.meter.label` | Risk meter: {percent} out of 100 | Mức nguy cơ: {percent} trên 100 |
| `result.message.heading` | Your message | Tin nhắn của bạn |
| `result.message.note` | Highlighted parts are where we saw a warning sign. | Phần được tô sáng là chỗ chúng tôi thấy dấu hiệu lạ. |
| `result.highlight.srLabel` | Suspicious part: | Đoạn đáng ngờ: |
| `result.signals.heading` | Why we are cautious | Vì sao chúng tôi thấy lạ |
| `result.evidence.label` | What we saw: | Chỗ đáng ngờ: |
| `result.severity.low` | Minor | Mức nhẹ |
| `result.severity.medium` | Moderate | Mức vừa |
| `result.severity.high` | Serious | Mức nặng |
| `result.actions.heading` | What to do next | Bạn nên làm gì |
| `result.limitations.heading` | Good to know | Điều cần nhớ |
| `result.tips.heading` | How to spot it | Cách nhận ra |
| `result.tech.summary` | Technical details | Chi tiết kỹ thuật |
| `result.withheld` | We cannot show this result reliably. Please try again. | Chúng tôi chưa thể hiển thị kết quả này một cách đáng tin. Hãy thử kiểm tra lại. |
| `result.noSignals.summary` | No warning signs found. | Chưa thấy dấu hiệu cảnh báo nào. |
| `result.noSignals.notSafeNote` (dedicated key) | No warning signs found does not mean this message is genuine or safe. | Chưa thấy dấu hiệu cảnh báo không có nghĩa là tin nhắn này là thật hay an toàn. |
| `result.noSignals.reminder` | If a message asks for money, a code or personal details, call the official number yourself to check. | Nếu tin nhắn đòi tiền, mã xác nhận hoặc thông tin cá nhân, hãy tự gọi số điện thoại chính thức để hỏi lại. |
| `level.no_signals` | Nothing detected yet | Chưa phát hiện dấu hiệu nào |
| `level.suspicious` | Some warning signs present | Có vài dấu hiệu cần để ý |
| `level.high` | Multiple warning signs, be cautious | Nhiều dấu hiệu cảnh báo, hãy cẩn thận |
| `level.critical` | Strong indicators of a scam | Dấu hiệu rất mạnh của lừa đảo |
| `source.text` | In the message text | Trong nội dung tin nhắn |
| `source.url` | In the link | Trong đường dẫn |
| `source.semantic` | In the wording | Trong cách diễn đạt |
| `source.image` | In the image | Trong ảnh |
| `source.qr` | In the QR code | Trong mã QR |
| `source.other` | Other signs | Dấu hiệu khác |
| `semantic.used` | An extra language check was also used. | Chúng tôi có dùng thêm một bước đọc hiểu ngôn ngữ. |
| `semantic.skipped` | This time only the built-in checks were used. | Lần này chỉ dùng các bước kiểm tra có sẵn. |
| `semantic.budget-exhausted` | The extra language check is busy right now, so only the built-in checks were used. | Bước đọc hiểu ngôn ngữ đang quá tải, nên chỉ dùng các bước kiểm tra có sẵn. |
| `semantic.not-configured` | The extra language check is switched off, so only the built-in checks were used. | Bước đọc hiểu ngôn ngữ hiện chưa bật, nên chỉ dùng các bước kiểm tra có sẵn. |
| `semantic.degraded` | The extra language check did not finish, so only the built-in checks were used. | Bước đọc hiểu ngôn ngữ không hoàn tất, nên chỉ dùng các bước kiểm tra có sẵn. |

#### Signal explanations (`signal.<id>.explain`)

English is a plain rewrite of each analyzer `whyItMatters`, with a next step.

| Id | en (primary) | vi (draft, pending human review) |
|---|---|---|
| `text.otp-request` | The message asks for a code or password. Real banks do not ask for these by message. Do not share them. | Tin nhắn xin mã xác nhận hoặc mật khẩu. Ngân hàng thật không xin những thứ này qua tin nhắn. Đừng chia sẻ chúng. |
| `text.urgency` | The message tries to rush you. Scammers want you to act before you can think. Take your time and check first. | Tin nhắn thúc bạn làm thật nhanh. Kẻ lừa đảo muốn bạn không có thời gian suy nghĩ. Hãy bình tĩnh và kiểm tra trước. |
| `text.threat` | The message threatens you, for example with a locked account or a fine. Real agencies do not do this by message. Do not act on it. | Tin nhắn dọa bạn, ví dụ khóa tài khoản hoặc phạt tiền. Cơ quan thật không làm vậy qua tin nhắn. Đừng làm theo. |
| `text.prize-reward` | The message says you won a prize, gift or refund. If you did not enter anything, this is very unlikely to be real. | Tin nhắn nói bạn trúng thưởng, được quà hoặc hoàn tiền. Nếu bạn không tham gia gì thì rất khó là thật. |
| `text.payment-request` | The message asks you to send money or pay a fee. Money sent to a scammer is very hard to get back. Confirm by a number you trust first. | Tin nhắn đòi bạn chuyển tiền hoặc nộp phí. Tiền đã chuyển cho kẻ lừa đảo rất khó lấy lại. Hãy xác nhận qua số điện thoại đáng tin trước. |
| `text.authority-impersonation` | The message claims to be from a bank, the police or a tax office. Scammers pretend to be them to earn your trust. Call the real office on a number you look up yourself. | Tin nhắn nói là của ngân hàng, công an hay cơ quan thuế. Kẻ lừa đảo giả danh để bạn tin. Hãy gọi đến số do chính bạn tìm. |
| `text.off-platform` | The message asks you to move to another app or keep it secret. This stops others from warning you. Talk to someone you trust. | Tin nhắn rủ bạn sang ứng dụng khác hoặc giữ bí mật. Như vậy sẽ không ai kịp cảnh báo bạn. Hãy nói chuyện với người bạn tin. |
| `text.sensitive-data-request` | The message asks for card numbers, ID details or bank logins. A scammer can use them to take your money. Do not send them. | Tin nhắn xin số thẻ, giấy tờ hoặc mật khẩu ngân hàng. Kẻ xấu có thể dùng chúng để lấy tiền của bạn. Đừng gửi. |
| `url.punycode-host` | The web address uses unusual characters to look like a real site. Do not open it. | Địa chỉ web dùng ký tự lạ để trông giống một trang thật. Đừng mở nó. |
| `url.ip-address-host` | The web address is just a string of numbers, not a normal site name. Do not open it. | Địa chỉ web chỉ là một dãy số, không phải tên trang web thông thường. Đừng mở nó. |
| `url.at-in-authority` | The web address has an @ sign that hides where it really goes. Do not open it. | Địa chỉ web có ký tự @ để giấu nơi nó thật sự dẫn đến. Đừng mở nó. |
| `url.excessive-subdomains` | The web address has too many parts. This can make a fake site look real. Do not open it. | Địa chỉ web có quá nhiều phần. Điều này có thể làm trang giả trông như thật. Đừng mở nó. |
| `url.known-shortener` | This is a shortened link, so you cannot see where it leads. Ask the sender for the full address. | Đây là đường dẫn rút gọn nên bạn không biết nó dẫn đến đâu. Hãy hỏi người gửi địa chỉ đầy đủ. |
| `url.brand-lookalike` | The site name looks almost like a well-known brand, but it is not the real site. Type the real address yourself. | Tên trang web gần giống một thương hiệu nổi tiếng nhưng không phải trang thật. Hãy tự gõ địa chỉ thật. |
| `url.credential-keywords` | The link has words like login or verify. Fake pages that steal passwords often use them. Do not enter your password. | Đường dẫn có chữ như login hoặc verify. Trang giả lấy mật khẩu hay dùng các chữ này. Đừng nhập mật khẩu. |
| `semantic.impersonation-tone` | The message sounds like a bank or agency, but something is off. Call the official number yourself to check. | Giọng văn giống ngân hàng hoặc cơ quan nhưng có chỗ không đúng. Hãy tự gọi số chính thức để hỏi. |
| `semantic.emotional-manipulation` | The message plays on fear or sympathy to make you act at once. Pause and check with someone you trust. | Tin nhắn đánh vào nỗi sợ hoặc lòng thương để bạn làm theo ngay. Hãy dừng lại và hỏi người bạn tin. |
| `semantic.too-good-to-be-true` | The offer promises a lot for little effort. Real chances rarely come unasked. Check the company on its official website. | Lời hứa quá hấp dẫn so với công sức bỏ ra. Cơ hội thật hiếm khi tự tìm đến bạn. Hãy kiểm tra công ty trên trang web chính thức. |
| `semantic.isolation-secrecy` | You are asked not to tell family, friends or your bank. Scammers do this so nobody can stop you. Tell someone you trust. | Tin nhắn bảo bạn đừng nói với người thân hay ngân hàng. Kẻ lừa đảo làm vậy để không ai cản bạn. Hãy kể cho người bạn tin. |
| `semantic.relationship-or-job-bait` | A stranger is friendly or offers easy paid work. This can win your trust before they ask for money. Check who they are first. | Một người lạ tỏ ra thân thiện hoặc mời việc dễ kiếm tiền. Đây có thể là cách lấy lòng tin trước khi xin tiền. Hãy tìm hiểu họ là ai trước. |
| `semantic.pressure-escalation` | The message keeps pushing you harder. Real organisations usually give you time. Check before you reply. | Tin nhắn càng lúc càng thúc ép bạn. Cơ quan thật thường cho bạn thời gian. Hãy kiểm tra trước khi trả lời. |
| `signal.unknown.explain` | We found a warning sign in this content. Check with the sender in a way you trust. | Chúng tôi thấy một dấu hiệu lạ trong nội dung này. Hãy hỏi lại người gửi bằng cách bạn tin tưởng. |

#### Monsters (`monster.<id>.name | short | tip1 | tip2 | tip3`)

English names are primary; Vietnamese names are translations.

| Id | Key part | en (primary) | vi (draft, pending human review) |
|---|---|---|---|
| `bank` | name | Bank Ghost | Bóng ma ngân hàng |
| `bank` | short | Pretends to be your bank to get your code, password or card number. | Giả làm ngân hàng để xin mã, mật khẩu hoặc số thẻ của bạn. |
| `bank` | tip1 | It asks for a code or password. Real banks do not. | Nó xin mã hoặc mật khẩu. Ngân hàng thật không xin. |
| `bank` | tip2 | It threatens to lock your account and wants you to act now. | Nó dọa khóa tài khoản và bắt bạn làm ngay. |
| `bank` | tip3 | It sends a strange link. Open your bank app yourself instead. | Nó gửi đường dẫn lạ. Hãy tự mở ứng dụng ngân hàng thay vì bấm vào. |
| `prize` | name | Gift Vampire | Ma cà rồng quà tặng |
| `prize` | short | Promises a gift or prize to drain your money and details. | Hứa cho bạn quà hoặc giải thưởng để hút tiền và thông tin của bạn. |
| `prize` | tip1 | You won a prize you never entered for. | Bạn trúng thưởng dù chưa tham gia gì. |
| `prize` | tip2 | It asks you to pay a fee to get the gift. | Nó đòi bạn trả phí để nhận quà. |
| `prize` | tip3 | It tells you to reply fast or lose the gift. | Nó bảo bạn trả lời gấp kẻo mất quà. |
| `job-bait` | name | Job Zombie | Xác sống việc làm |
| `job-bait` | short | Offers easy, well-paid work to take your deposit or details. | Mời việc nhẹ lương cao để lấy tiền cọc hoặc thông tin của bạn. |
| `job-bait` | tip1 | The work is easy but the pay is very high. | Việc nhẹ mà lương rất cao. |
| `job-bait` | tip2 | It asks you to chat on another app, like Telegram or Zalo. | Nó rủ bạn sang ứng dụng khác như Telegram hoặc Zalo để nói chuyện. |
| `job-bait` | tip3 | It asks for a deposit or fee before you start. | Nó đòi tiền cọc hoặc phí trước khi bạn đi làm. |
| `authority` | name | Authority Banshee | Ma nữ khẩn cấp |
| `authority` | short | Pretends to be the police or an agency to scare you into obeying. | Giả làm công an hay cơ quan nhà nước để dọa bạn phải làm theo. |
| `authority` | tip1 | It says you are linked to a case. | Nó nói bạn có liên quan đến một vụ việc. |
| `authority` | tip2 | It threatens arrest or a fine if you do not act now. | Nó dọa bắt hoặc phạt nếu bạn không làm ngay. |
| `authority` | tip3 | It tells you to keep it secret and send money. | Nó bảo bạn giữ bí mật và chuyển tiền. |
| `generic` | name | Odd Shadow | Bóng lạ |
| `generic` | short | The message has warning signs but does not fit one known kind of scam. | Tin nhắn có dấu hiệu lạ nhưng chưa giống một kiểu lừa đảo quen thuộc. |
| `generic` | tip1 | It comes out of the blue from someone you do not know. | Nó đến bất ngờ từ người bạn không quen. |
| `generic` | tip2 | It pushes you to hurry. | Nó thúc bạn làm thật nhanh. |
| `generic` | tip3 | It asks for money, codes or personal details. | Nó xin tiền, mã hoặc thông tin cá nhân. |
| `neutral` | name | Watchful Candle | Ngọn nến canh gác |
| `neutral` | short | No signs yet, but stay careful. | Chưa có dấu hiệu nào, nhưng bạn vẫn nên cẩn thận. |

#### Notices

| Key | en (primary) | vi (draft, pending human review) |
|---|---|---|
| `notice.ocr-skipped` | We skipped reading text because the image has a QR code. | Chúng tôi đã bỏ qua bước đọc chữ vì ảnh có mã QR. |
| `notice.ocr-too-poor` | The text in the image was too blurry to read. Try a clearer image or paste the text. | Chữ trong ảnh quá mờ nên chúng tôi không đọc được. Hãy thử ảnh rõ hơn hoặc dán chữ vào. |
| `notice.ocr-failed` | We could not read the text in the image. Try again or paste the text. | Chúng tôi không đọc được chữ trong ảnh. Hãy thử lại hoặc dán chữ vào. |
| `notice.payment-qr` | This is a payment QR code. We do not check its content. Do not scan it if you are unsure. | Đây là mã QR thanh toán. Chúng tôi không kiểm tra nội dung của nó. Đừng quét nếu bạn không chắc. |
| `notice.wifi-qr` | This is a Wi-Fi QR code. We do not check its content. | Đây là mã QR kết nối Wi-Fi. Chúng tôi không kiểm tra nội dung của nó. |
| `notice.no-url` | This QR code has no web link, so we cannot check it. | Mã QR này không có đường dẫn web nên chúng tôi không kiểm tra được. |
| `notice.text-truncated` | The message is too long. We only checked the first part. | Tin nhắn quá dài. Chúng tôi chỉ kiểm tra phần đầu. |
| `notice.urls-skipped` | {count} links were not checked because there were too many. | Có {count} đường dẫn chưa được kiểm tra vì có quá nhiều. |
| `notice.generic` | There is another note about this result. | Có một lưu ý khác về kết quả này. |

#### Errors

English texts are the reference for the message mapping.

| Key | en (primary) | vi (draft, pending human review) |
|---|---|---|
| `error.analyze.invalid-input` | The content is not valid. Check the message and try again. | Nội dung chưa hợp lệ. Hãy kiểm tra lại tin nhắn rồi thử lại. |
| `error.analyze.payload-too-large` | The content is too long. Shorten it and try again. | Nội dung quá dài. Hãy rút ngắn rồi thử lại. |
| `error.analyze.invalid-content-type` | Something went wrong when sending. Reload the page and try again. | Có lỗi khi gửi nội dung. Hãy tải lại trang rồi thử lại. |
| `error.analyze.rate-limited` | You have checked many times. Please wait {seconds} sec and try again. | Bạn kiểm tra hơi nhiều lần. Hãy đợi {seconds} giây rồi thử lại. |
| `error.analyze.internal-error` | Something went wrong on our side. Please try again in a few minutes. | Hệ thống đang gặp sự cố. Hãy thử lại sau ít phút. |
| `error.analyze.network-error` | We could not connect. Check your connection and try again. | Không kết nối được mạng. Hãy kiểm tra mạng rồi thử lại. |
| `error.analyze.timeout` | The check took too long. Please try again. | Việc kiểm tra mất quá lâu. Hãy thử lại. |
| `error.analyze.bad-response` | We got a result we could not read. Please try again. | Chúng tôi nhận được kết quả không đọc được. Hãy thử lại. |
| `error.analyze.unexpected-status` | The system answered in an unexpected way. Please try again later. | Hệ thống trả lời không như mong đợi. Hãy thử lại sau. |
| `error.ingest.unsupported-type` | This file type is not supported. Use PNG, JPG or WebP. | Định dạng tệp này chưa được hỗ trợ. Hãy dùng PNG, JPG hoặc WebP. |
| `error.ingest.invalid-size` | The image file is empty or damaged. Choose another image. | Tệp ảnh trống hoặc bị lỗi. Hãy chọn ảnh khác. |
| `error.ingest.file-too-large` | The image is too large. Choose one smaller than {maxMb} MB. | Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn {maxMb} MB. |
| `error.ingest.decode-failed` | We could not open this image. Try another one. | Chúng tôi không mở được ảnh này. Hãy thử ảnh khác. |
| `error.ingest.too-many-pixels` | The image resolution is too high. Choose a smaller image. | Ảnh có độ phân giải quá cao. Hãy chọn ảnh nhỏ hơn. |
| `error.ingest.canvas-unavailable` | Your browser cannot process the image. Try another browser or paste the text. | Trình duyệt của bạn không xử lý được ảnh. Hãy thử trình duyệt khác hoặc dán chữ vào. |
| `error.ingest.ocr-engine-unavailable` | The text reader could not be loaded. Paste the text into the box instead. | Không tải được công cụ đọc chữ. Hãy dán chữ vào ô nhập. |
| `error.ingest.ocr-timeout` | Reading the image took too long. Try a smaller image or paste the text. | Đọc chữ trong ảnh mất quá lâu. Hãy thử ảnh nhỏ hơn hoặc dán chữ vào. |
| `error.ingest.ocr-aborted` | Reading the text was stopped. | Đã dừng việc đọc chữ. |
| `error.ingest.ocr-failed` | We could not read the text in the image. Paste the text into the box instead. | Chúng tôi không đọc được chữ trong ảnh. Hãy dán chữ vào ô nhập. |
| `error.ingest.qr-engine-unavailable` | The QR reader could not be loaded. Try again later. | Không tải được công cụ đọc mã QR. Hãy thử lại sau. |
| `error.ingest.qr-decode-failed` | We could not read the QR code in the image. Try a clearer image. | Chúng tôi không đọc được mã QR trong ảnh. Hãy thử ảnh rõ hơn. |
| `error.ingest.unexpected` | Something unexpected happened. Please try again. | Có lỗi không mong muốn. Hãy thử lại. |
| `error.generic` | Something went wrong. Please try again. | Có lỗi xảy ra. Hãy thử lại. |
| `error.technical.label` | Error code: {code} | Mã lỗi: {code} |

## Messages mapping

Three lookup tables typed `Record<Code, MessageKey>` where `Code` is
`AnalyzeClientCode`, `IngestErrorCode` and the notice kind unions (type-imported
from `../client/ingest`). Lookup uses `Object.hasOwn(table, code)` after a
`typeof code === "string"` check, so inherited names resolve to generic.

```ts
interface MessageRef {
  readonly key: MessageKey;
  readonly params: Params;
  readonly technicalCode: string;  // known code or "unknown"
}
analyzeErrorMessage("rate-limited", 42)  // { key: "error.analyze.rate-limited", params: { seconds: 42 }, technicalCode: "rate-limited" }
```

`seconds = clamp(Math.ceil(n), 1, MAX_RETRY_AFTER_SEC)` for a finite number `n`,
else `DEFAULT_RETRY_AFTER_SEC`. `maxMb = Math.floor(MAX_IMAGE_BYTES / 1048576)`.
`ocr-too-poor` as an ingest notice and `ocr-failed` as an error code are
different dictionary entries (`notice.*` and `error.ingest.*`).

The English texts in the Errors and Notices tables are the reference. For
example `unsupported-type` reads "This file type is not supported. Use PNG, JPG
or WebP." and `rate-limited` with `retryAfterSec: 42` resolves in English to
"You have checked many times. Please wait 42 sec and try again." Message tests
assert English text first; Vietnamese is only checked for structure (same
placeholders, PNG/JPG/WebP named).

## Result view

```ts
type ResultView = ReadyResultView | WithheldResultView;

interface WithheldResultView {
  readonly kind: "withheld";
  readonly messageKey: "result.withheld";
  readonly notices: readonly NoticeView[];
}

interface ReadyResultView {
  readonly kind: "ready";
  readonly state: "neutral" | "monster";
  readonly locale: Locale;
  readonly monster: {
    readonly id: MonsterKey;
    readonly nameKey: MessageKey; readonly shortKey: MessageKey;
    readonly tipKeys: readonly MessageKey[];   // 3 for monsters, [] for neutral
    readonly colorToken: ColorToken; readonly artKey: string;
  };
  readonly levelKey: MessageKey;               // level.<level>
  readonly riskMeter: {
    readonly percent: number; readonly labelKey: MessageKey;
    readonly iconKey: string; readonly darknessBand: 0 | 1 | 2 | 3;
  };
  readonly noSignals: { summaryKey; notSafeKey; reminderKey } | null;  // only in neutral
  readonly highlights: readonly HighlightSegment[];
  readonly signalGroups: readonly {
    readonly source: string; readonly labelKey: MessageKey;
    readonly cards: readonly {
      readonly signalId: string; readonly explanationKey: MessageKey;
      readonly evidence: string; readonly severityBand: "low" | "medium" | "high";
    }[];
  }[];
  readonly actions: readonly string[];
  readonly limitations: readonly string[];
  readonly semanticNoteKey: MessageKey;
  readonly notices: readonly NoticeView[];
  readonly announcement: string;               // t(locale, "a11y.result-ready", { level })
}

interface NoticeView {
  readonly kind: string; readonly key: MessageKey; readonly params: Params;
  readonly tone: "info" | "warning";
}
```

Decisions:

- **Evidence rule.** The privacy rule says a level is never shown without
  evidence, so the view is `withheld` unless `(level === "no_signals") ===
  (signals.length === 0)` and at least one card exists for any other level. The
  real pipeline satisfies this (aggregator: score 0 with signals is already
  `suspicious`).
- **Locale** only affects `announcement` and is echoed. All other text is a key
  that the component resolves with `t`, so a language switch re-renders at once.
- **Level table** (`theme/levels.ts`), used by the meter:

  | Level | labelKey | iconKey | colorToken | darknessBand |
  |---|---|---|---|---|
  | `no_signals` | `level.no_signals` | `icon-candle` | `level-none` | 0 |
  | `suspicious` | `level.suspicious` | `icon-eye` | `level-suspicious` | 1 |
  | `high` | `level.high` | `icon-warning` | `level-high` | 2 |
  | `critical` | `level.critical` | `icon-stop` | `level-critical` | 3 |

  Band comes from the level, `percent` from the score; they never contradict
  each other for real verdicts, and the property tests treat them separately.
- **Monster choice**: neutral if `no_signals`; otherwise `verdict.monster` when it
  is a known id, else `generic`.
- **Semantic note** follows the first-match table of REQ-UI-20. The mode comes
  from `meta.semanticMode` and wins over the verdict because only the server
  knows about budget exhaustion and a missing key.
- **Notice tones**: `ocr-too-poor`, `ocr-failed`, `payment-qr`, `text-truncated`,
  `urls-skipped` are `warning`; `ocr-skipped`, `wifi-qr`, `no-url` and
  `notice.generic` are `info`. `ocr-too-poor` is removed when a QR result exists
  or the user typed text, because the check still had something to analyze.
- **Short evidence**: `Array.from(text.replace(/\s+/g, " ").trim())`, cut at 80
  code points, `…` appended when cut. Evidence is user content and is only
  rendered in memory; nothing is stored or logged.
- `actions` and `limitations` are copied as given (non-empty strings only). The
  existing pipeline texts never claim safety (REQ-PIPE-41); this layer does not
  alter them.

## Highlighting

```ts
export function computeHighlights(text: string, evidences: readonly string[]): HighlightSegment[]
```

Algorithm:

1. Guard: `typeof text !== "string"` gives `[]`; empty text gives `[]`.
2. Take at most 50 evidences, keep strings only, `trim()`, drop empty, drop
   those longer than 200 characters or than the text, de-duplicate.
3. `ranges = []`. For each needle: collect exact occurrences with `indexOf`
   (step one code unit after each hit, capped at 200 ranges in total). If none,
   fold the needle with the same function and search the Folded_Text.
4. Fold (`view/folding.ts`):

   ```ts
   function fold(cp: string): string {
     return cp.normalize("NFD").replace(/\p{M}/gu, "").replace(/[đĐ]/g, "d")
       .toLowerCase().replace(/\p{M}/gu, "");
   }
   // foldWithMap(text) => { folded: string; starts: number[]; ends: number[] }
   // for (const cp of text): out = /^\s+$/u.test(cp) ? " " : fold(cp);
   //   whitespace folds to one " " and extends the previous whitespace entry;
   //   every UTF-16 unit of `out` gets starts = i, ends = i + cp.length.
   ```

   NFD alone turns `ế` into `e` plus two marks and `đ` has no decomposition, so
   the explicit `đ` rule is needed. A hit `[a, b)` in folded text maps to
   `[starts[a], ends[b - 1])`, so a range always starts and ends on a code point
   boundary. Matching `e` against `ê` highlights the whole `ê`.
5. Clip ranges to `[0, text.length)`, sort, merge overlapping and touching ranges.
6. Emit alternating plain and highlighted segments with `text.slice(start, end)`.

Because segments are produced from a sorted, merged range list over
`[0, length)`, the partition property holds by construction. The folding and the
search are linear in the text per needle, so 50 needles on 4000 characters is
small. Punctuation is not folded: a phrase the analyzer matched across
punctuation (`"tài khoản, bị khóa"`) is not highlighted. This is accepted by
REQ-UI-26 (not locatable means not highlighted).

`evidenceNeedles(signal)`:

| Id pattern | Needles (after the whole evidence) |
|---|---|
| `text.*` | `evidence.split(", ")` parts |
| `url.credential-keywords` | text after `" in path "` |
| `url.brand-lookalike` | text before `" looks like "` |
| `url.excessive-subdomains` | evidence without the final `" (N parts)"` |
| anything else | none (the whole evidence only) |

`computeHighlights` is called with the flattened needles of all signals.

## Monster presentation

```ts
export type MonsterKey = MonsterId | "neutral";
export const MONSTER_PRESENTATION: Readonly<Record<MonsterKey, {
  readonly id: MonsterKey; readonly nameKey: MessageKey;
  readonly colorToken: ColorToken; readonly artKey: string;
}>> = {
  bank:      { id: "bank",      nameKey: "monster.bank.name",      colorToken: "monster-bank",      artKey: "monster-bank-ghost" },
  prize:     { id: "prize",     nameKey: "monster.prize.name",     colorToken: "monster-prize",     artKey: "monster-prize-vampire" },
  "job-bait":{ id: "job-bait",  nameKey: "monster.job-bait.name",  colorToken: "monster-job-bait",  artKey: "monster-job-zombie" },
  authority: { id: "authority", nameKey: "monster.authority.name", colorToken: "monster-authority", artKey: "monster-authority-banshee" },
  generic:   { id: "generic",   nameKey: "monster.generic.name",   colorToken: "monster-generic",   artKey: "monster-generic-shade" },
  neutral:   { id: "neutral",   nameKey: "monster.neutral.name",   colorToken: "monster-neutral",   artKey: "monster-neutral-candle" },
};
```

`Record<MonsterKey, …>` makes a new pipeline `MonsterId` a compile error here.
The test also compares with the runtime `MONSTERS` config.

## Theme

`ColorToken` is the union of the token names below. Both palettes define every
token. Values (`#RRGGBB`) were checked with the WCAG 2 formula while writing this
design; the ratios against `bg` / `surface` / `raised` are in the last columns
(normal palette, text uses need 4.5, `ui` uses need 3).

| Token | Normal | High contrast | Use | Normal ratio on bg / surface / raised |
|---|---|---|---|---|
| `bg` | `#1B1230` | `#000000` | page background (ink purple) | |
| `surface` | `#2A1B47` | `#0A0612` | cards | |
| `raised` | `#3A2762` | `#160D26` | raised panels | |
| `text` | `#F6F0FF` | `#FFFFFF` | body text | 16.0 / 14.0 / 11.4 |
| `muted` | `#CDBFEA` | `#EDE6FA` | secondary text | 10.4 / 9.1 / 7.4 |
| `accent` | `#FFA94D` | `#FFC266` | candle orange: links, buttons | 9.4 / 8.2 / 6.7 |
| `on-accent` | `#1B1230` | `#000000` | text on `accent` | 9.4 on `accent` |
| `focus` | `#FFD27A` | `#FFFF66` | focus ring (`ui`) | 12.6 / 11.0 / 9.0 |
| `border` | `#9C88CC` | `#E3D9FF` | borders (`ui`) | 5.8 / 5.1 / 4.1 |
| `level-none` | `#A9C4FF` | `#BBD0FF` | level text and icon | 10.2 / 8.9 / 7.3 |
| `level-suspicious` | `#FFD166` | `#FFE680` | level text and icon | 12.4 / 10.8 / 8.9 |
| `level-high` | `#FF9A52` | `#FFB070` | level text and icon | 8.5 / 7.4 / 6.1 |
| `level-critical` | `#FF8097` | `#FFA0B0` | level text and icon | 7.5 / 6.5 / 5.3 |
| `monster-bank` | `#7FD1FF` | `#9CDDFF` | monster accent | 10.6 / 9.3 / 7.6 |
| `monster-prize` | `#FF8AD8` | `#FFA3E2` | monster accent | 8.4 / 7.3 / 6.0 |
| `monster-job-bait` | `#9BE58F` | `#B5F0AA` | monster accent | 11.9 / 10.4 / 8.5 |
| `monster-authority` | `#FFB3A7` | `#FFC8BF` | monster accent | 10.4 / 9.1 / 7.4 |
| `monster-generic` | `#CDBFEA` | `#EDE6FA` | monster accent | 10.4 / 9.1 / 7.4 |
| `monster-neutral` | `#FFD27A` | `#FFE08F` | monster accent | 12.6 / 11.0 / 9.0 |

The art is original; no existing character or trademark is referenced.

`DECLARED_PAIRS` lists `{ fg, bg, use }`: `text`, `muted` on `bg`, `surface`,
`raised` (`text`); `accent` on `bg`, `surface` (`text`); `on-accent` on
`accent` (`text`); the four level tokens and five monster tokens on `surface`
and `raised` (`text`); `focus` and `border` on `bg`, `surface`, `raised` (`ui`).
Thresholds: `text` 4.5, `large-text` 3, `ui` 3, and 7 for `text` in the
high-contrast palette. The first run of the test is the real check; if a value
fails, change the palette, not the threshold.

```ts
export function contrastRatio(foreground: string, background: string): number
// parse #RGB or #RRGGBB; invalid => 1
// channel c in 0..1 => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
// L = 0.2126 R + 0.7152 G + 0.0722 B; ratio = (max(L1, L2) + 0.05) / (min(L1, L2) + 0.05)
```

## Preferences

```ts
const KEYS = {
  language: "trickhunt.pref.language", textSize: "trickhunt.pref.textSize",
  reduceMotion: "trickhunt.pref.reduceMotion", highContrast: "trickhunt.pref.highContrast",
} as const;
```

- Defaults: `{ language: DEFAULT_LOCALE, textSize: 100, reduceMotion: false,
  highContrast: false }`. The language default is always `"en"`.
- `loadPreferences(storage)`: for each of the four keys, `try`
  `storage.getItem(KEYS[k])`, parse with a per-key closed parser (`"vi"|"en"`;
  `"100"|"125"|"150"` to number; `"true"|"false"` to boolean); anything else
  gives the default. A throwing, missing or junk storage gives all defaults, so
  `language` is `"en"` unless the saved value is exactly `"vi"`.
- `savePreference(storage, key, value)`: `Object.hasOwn(KEYS, key)` and the
  same validator as the parser on the value, then `try { storage.setItem(...)
  ; return true } catch { return false }`.
- **Removed:** `chooseInitialLanguage` and its tests. There is no language
  detection: nothing in `src/ui/` reads `navigator.language` or any other
  browser setting, and no replacement constant function is kept. The user picks
  Vietnamese in settings, and that choice is saved with `savePreference`.
- `getBrowserStorage()`: `try { return globalThis.localStorage ?? null } catch
  { return null }` with a structural check for `getItem`/`setItem`. This is the
  only line in `src/ui/` that contains the word `localStorage`; the comments in
  the file avoid the other storage words too.

Nothing but these four keys with these values is ever stored, so no user
content, text or image can reach storage.

## Change to `src/client/ingest/boundaries.test.ts`

The current test scans `src/client` and `src/app/try` only, and its "uses no
browser storage" check forbids `localStorage`, `sessionStorage`, `indexedDB`,
`document.cookie` and `caches.` everywhere. The change is:

1. `SCAN_DIRS` gains `join(ROOT, "src", "ui")`, so all existing checks (no
   `server/` import, no `XMLHttpRequest` and similar, `fetch(` only in
   `analyze-client.ts`, no CDN) also apply to `src/ui/`.
2. The storage check becomes two checks:
   - For every scanned file except `preferences.ts`: no `localStorage`,
     `sessionStorage`, `indexedDB`, `document.cookie`, `caches.` (unchanged rule).
   - For `preferences.ts` (must exist): it may contain `localStorage` and must
     not contain `sessionStorage`, `indexedDB`, `document.cookie` or `caches.`.
     The allowance is by exact file name inside `src/ui/`; a `preferences.ts`
     elsewhere (for example in `src/client`) is still rejected.
3. New checks for `src/ui/` sources only (non-test): no import from `react`,
   `next` or `react-dom`; no `window`, `document`, `navigator`, `process`
   identifiers; no `http://` or `https://` strings; and every import from a path
   containing `pipeline` or `client/ingest` is `import type`, except the single
   allowed `../client/ingest/ingest.config` runtime import.
   The `navigator` ban covers `navigator.language`. A dedicated test in
   `src/ui/default-locale.test.ts` also scans every non-test file under
   `src/ui/` for `navigator.language` and for `navigator` itself.
4. The test "scans at least the ingest sources" also asserts that `preferences.ts`
   and `result-view.ts` are found.

Statement of the change: this is the only test edit outside `src/ui/`. It
widens the storage rule from "no file" to "exactly `src/ui/preferences.ts`,
`localStorage` only", as required by `ui-rules.md` (one module, closed keys,
try/catch), and extends the existing boundary checks to the new folder. No
other existing test changes.
