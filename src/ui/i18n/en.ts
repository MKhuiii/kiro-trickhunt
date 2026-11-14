/**
 * English dictionary: the primary UI language and the source of every string.
 * Its keys define `MessageKey`; `vi.ts` must have exactly the same keys.
 */
export const en = {
  // App, input, progress, privacy
  "app.name": "TrickHunt",
  "app.tagline": "Check a strange message before you reply.",
  "input.text.label": "Paste the message or link you want to check",
  "input.text.hint": "You can paste the whole message. We will find any links in it.",
  "input.image.label": "Choose a screenshot or QR code image",
  "input.image.hint": "You can also drop an image here or paste one.",
  "input.image.selected": "One image selected.",
  "input.image.remove": "Remove the selected image",
  "input.submit": "Check",
  "input.reset": "Check another message",
  "input.empty": "Paste a message or choose an image to start.",
  "progress.preparing": "Getting the image ready…",
  "progress.qr": "Looking for a QR code…",
  "progress.ocr.loading": "Loading the text reader…",
  "progress.ocr.recognizing": "Reading the text in the image: {percent}%",
  "progress.sending": "Looking for warning signs…",
  "progress.done": "Your result is ready.",
  "progress.nothing": "There is nothing to check. Add a message or an image.",
  "privacy.note":
    "Your image never leaves your device. Only text and links are sent to be checked, and we do not store them.",
  "a11y.skip": "Skip to main content",
  "a11y.result-ready": "Result ready: {level}",

  // Preferences
  "prefs.heading": "Settings",
  "prefs.language": "Language",
  "prefs.language.vi": "Tiếng Việt",
  "prefs.language.en": "English",
  "prefs.textSize": "Text size",
  "prefs.textSize.100": "Normal",
  "prefs.textSize.125": "Large",
  "prefs.textSize.150": "Extra large",
  "prefs.reduceMotion": "Reduce motion",
  "prefs.highContrast": "High contrast",

  // Result, levels, sources, semantic notes
  "result.heading": "Your result",
  "result.meter.label": "Risk meter: {percent} out of 100",
  "result.message.heading": "Your message",
  "result.message.note": "Highlighted parts are where we saw a warning sign.",
  "result.highlight.srLabel": "Suspicious part:",
  "result.signals.heading": "Why we are cautious",
  "result.evidence.label": "What we saw:",
  "result.severity.low": "Minor",
  "result.severity.medium": "Moderate",
  "result.severity.high": "Serious",
  "result.actions.heading": "What to do next",
  "result.limitations.heading": "Good to know",
  "result.tips.heading": "How to spot it",
  "result.tech.summary": "Technical details",
  "result.withheld": "We cannot show this result reliably. Please try again.",
  "result.noSignals.summary": "No warning signs found.",
  "result.noSignals.notSafeNote":
    "No warning signs found does not mean this message is genuine or safe.",
  "result.noSignals.reminder":
    "If a message asks for money, a code or personal details, call the official number yourself to check.",
  "level.no_signals": "Nothing detected yet",
  "level.suspicious": "Some warning signs present",
  "level.high": "Multiple warning signs, be cautious",
  "level.critical": "Strong indicators of a scam",
  "source.text": "In the message text",
  "source.url": "In the link",
  "source.semantic": "In the wording",
  "source.image": "In the image",
  "source.qr": "In the QR code",
  "source.other": "Other signs",
  "semantic.used": "An extra language check was also used.",
  "semantic.skipped": "This time only the built-in checks were used.",
  "semantic.budget-exhausted":
    "The extra language check is busy right now, so only the built-in checks were used.",
  "semantic.not-configured":
    "The extra language check is switched off, so only the built-in checks were used.",
  "semantic.degraded":
    "The extra language check did not finish, so only the built-in checks were used.",

  // Signal explanations
  "signal.text.otp-request.explain":
    "The message asks for a code or password. Real banks do not ask for these by message. Do not share them.",
  "signal.text.urgency.explain":
    "The message tries to rush you. Scammers want you to act before you can think. Take your time and check first.",
  "signal.text.threat.explain":
    "The message threatens you, for example with a locked account or a fine. Real agencies do not do this by message. Do not act on it.",
  "signal.text.prize-reward.explain":
    "The message says you won a prize, gift or refund. If you did not enter anything, this is very unlikely to be real.",
  "signal.text.payment-request.explain":
    "The message asks you to send money or pay a fee. Money sent to a scammer is very hard to get back. Confirm by a number you trust first.",
  "signal.text.authority-impersonation.explain":
    "The message claims to be from a bank, the police or a tax office. Scammers pretend to be them to earn your trust. Call the real office on a number you look up yourself.",
  "signal.text.off-platform.explain":
    "The message asks you to move to another app or keep it secret. This stops others from warning you. Talk to someone you trust.",
  "signal.text.sensitive-data-request.explain":
    "The message asks for card numbers, ID details or bank logins. A scammer can use them to take your money. Do not send them.",
  "signal.url.punycode-host.explain":
    "The web address uses unusual characters to look like a real site. Do not open it.",
  "signal.url.ip-address-host.explain":
    "The web address is just a string of numbers, not a normal site name. Do not open it.",
  "signal.url.at-in-authority.explain":
    "The web address has an @ sign that hides where it really goes. Do not open it.",
  "signal.url.excessive-subdomains.explain":
    "The web address has too many parts. This can make a fake site look real. Do not open it.",
  "signal.url.known-shortener.explain":
    "This is a shortened link, so you cannot see where it leads. Ask the sender for the full address.",
  "signal.url.brand-lookalike.explain":
    "The site name looks almost like a well-known brand, but it is not the real site. Type the real address yourself.",
  "signal.url.credential-keywords.explain":
    "The link has words like login or verify. Fake pages that steal passwords often use them. Do not enter your password.",
  "signal.semantic.impersonation-tone.explain":
    "The message sounds like a bank or agency, but something is off. Call the official number yourself to check.",
  "signal.semantic.emotional-manipulation.explain":
    "The message plays on fear or sympathy to make you act at once. Pause and check with someone you trust.",
  "signal.semantic.too-good-to-be-true.explain":
    "The offer promises a lot for little effort. Real chances rarely come unasked. Check the company on its official website.",
  "signal.semantic.isolation-secrecy.explain":
    "You are asked not to tell family, friends or your bank. Scammers do this so nobody can stop you. Tell someone you trust.",
  "signal.semantic.relationship-or-job-bait.explain":
    "A stranger is friendly or offers easy paid work. This can win your trust before they ask for money. Check who they are first.",
  "signal.semantic.pressure-escalation.explain":
    "The message keeps pushing you harder. Real organisations usually give you time. Check before you reply.",
  "signal.unknown.explain":
    "We found a warning sign in this content. Check with the sender in a way you trust.",

  // Monsters
  "monster.bank.name": "Bank Ghost",
  "monster.bank.short":
    "Pretends to be your bank to get your code, password or card number.",
  "monster.bank.tip1": "It asks for a code or password. Real banks do not.",
  "monster.bank.tip2": "It threatens to lock your account and wants you to act now.",
  "monster.bank.tip3": "It sends a strange link. Open your bank app yourself instead.",
  "monster.prize.name": "Gift Vampire",
  "monster.prize.short": "Promises a gift or prize to drain your money and details.",
  "monster.prize.tip1": "You won a prize you never entered for.",
  "monster.prize.tip2": "It asks you to pay a fee to get the gift.",
  "monster.prize.tip3": "It tells you to reply fast or lose the gift.",
  "monster.job-bait.name": "Job Zombie",
  "monster.job-bait.short": "Offers easy, well-paid work to take your deposit or details.",
  "monster.job-bait.tip1": "The work is easy but the pay is very high.",
  "monster.job-bait.tip2": "It asks you to chat on another app, like Telegram or Zalo.",
  "monster.job-bait.tip3": "It asks for a deposit or fee before you start.",
  "monster.authority.name": "Authority Banshee",
  "monster.authority.short":
    "Pretends to be the police or an agency to scare you into obeying.",
  "monster.authority.tip1": "It says you are linked to a case.",
  "monster.authority.tip2": "It threatens arrest or a fine if you do not act now.",
  "monster.authority.tip3": "It tells you to keep it secret and send money.",
  "monster.generic.name": "Odd Shadow",
  "monster.generic.short":
    "The message has warning signs but does not fit one known kind of scam.",
  "monster.generic.tip1": "It comes out of the blue from someone you do not know.",
  "monster.generic.tip2": "It pushes you to hurry.",
  "monster.generic.tip3": "It asks for money, codes or personal details.",
  "monster.neutral.name": "Watchful Candle",
  "monster.neutral.short": "No signs yet, but stay careful.",

  // Notices
  "notice.ocr-skipped": "We skipped reading text because the image has a QR code.",
  "notice.ocr-too-poor":
    "The text in the image was too blurry to read. Try a clearer image or paste the text.",
  "notice.ocr-failed":
    "We could not read the text in the image. Try again or paste the text.",
  "notice.payment-qr":
    "This is a payment QR code. We do not check its content. Do not scan it if you are unsure.",
  "notice.wifi-qr": "This is a Wi-Fi QR code. We do not check its content.",
  "notice.no-url": "This QR code has no web link, so we cannot check it.",
  "notice.text-truncated": "The message is too long. We only checked the first part.",
  "notice.urls-skipped": "{count} links were not checked because there were too many.",
  "notice.generic": "There is another note about this result.",

  // Errors
  "error.analyze.invalid-input":
    "The content is not valid. Check the message and try again.",
  "error.analyze.payload-too-large": "The content is too long. Shorten it and try again.",
  "error.analyze.invalid-content-type":
    "Something went wrong when sending. Reload the page and try again.",
  "error.analyze.rate-limited":
    "You have checked many times. Please wait {seconds} sec and try again.",
  "error.analyze.internal-error":
    "Something went wrong on our side. Please try again in a few minutes.",
  "error.analyze.network-error":
    "We could not connect. Check your connection and try again.",
  "error.analyze.timeout": "The check took too long. Please try again.",
  "error.analyze.bad-response":
    "We got a result we could not read. Please try again.",
  "error.analyze.unexpected-status":
    "The system answered in an unexpected way. Please try again later.",
  "error.ingest.unsupported-type":
    "This file type is not supported. Use PNG, JPG or WebP.",
  "error.ingest.invalid-size":
    "The image file is empty or damaged. Choose another image.",
  "error.ingest.file-too-large":
    "The image is too large. Choose one smaller than {maxMb} MB.",
  "error.ingest.decode-failed": "We could not open this image. Try another one.",
  "error.ingest.too-many-pixels":
    "The image resolution is too high. Choose a smaller image.",
  "error.ingest.canvas-unavailable":
    "Your browser cannot process the image. Try another browser or paste the text.",
  "error.ingest.ocr-engine-unavailable":
    "The text reader could not be loaded. Paste the text into the box instead.",
  "error.ingest.ocr-timeout":
    "Reading the image took too long. Try a smaller image or paste the text.",
  "error.ingest.ocr-aborted": "Reading the text was stopped.",
  "error.ingest.ocr-failed":
    "We could not read the text in the image. Paste the text into the box instead.",
  "error.ingest.qr-engine-unavailable":
    "The QR reader could not be loaded. Try again later.",
  "error.ingest.qr-decode-failed":
    "We could not read the QR code in the image. Try a clearer image.",
  "error.ingest.unexpected": "Something unexpected happened. Please try again.",
  "error.generic": "Something went wrong. Please try again.",
  "error.technical.label": "Error code: {code}",
} as const;

export type MessageKey = keyof typeof en;
