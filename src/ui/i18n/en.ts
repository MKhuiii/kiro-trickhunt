/**
 * English dictionary: the primary UI language and the source of every string.
 * Its keys define `MessageKey`; `vi.ts` must have exactly the same keys.
 */
export const en = {
  // App, input, progress, privacy
  "app.name": "TrickHunt",
  "app.tagline": "Before you reply, send the hunter into the dark after that strange message.",
  "input.text.label": "Paste the message or link you want to check",
  "input.text.hint": "You can paste the whole message. We will find any links in it.",
  "input.image.label": "Choose a screenshot or QR code image",
  "input.image.hint": "You can also drop an image here or paste one.",
  "input.image.selected": "One image selected.",
  "input.image.remove": "Remove the selected image",
  "input.submit": "Start the hunt",
  "input.reset": "Check another message",
  "input.empty": "Put a message or a picture in the bag to start the hunt.",
  "progress.preparing": "Lighting the lantern and getting the image ready…",
  "progress.qr": "Searching the dark for a QR code…",
  "progress.ocr.loading": "Waking the text reader…",
  "progress.ocr.recognizing": "Reading the strange marks in the image: {percent}%",
  "progress.sending": "Following the trail of warning signs…",
  "progress.done": "The hunt is over. Your report is ready.",
  "progress.nothing": "The bag is empty. Add a message or an image.",
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
  "result.heading": "Your hunt report",
  "result.meter.label": "Risk meter: {percent} out of 100",
  "result.message.heading": "The message you gave the hunter",
  "result.message.note": "Highlighted parts are where the hunter found a warning sign.",
  "result.highlight.srLabel": "Suspicious part:",
  "result.signals.heading": "Why the hunter is cautious",
  "result.evidence.label": "What the hunter saw:",
  "result.severity.low": "Minor",
  "result.severity.medium": "Moderate",
  "result.severity.high": "Serious",
  "result.actions.heading": "What to do now",
  "result.aiNote.heading": "Extra check not available",
  "result.aiNote.unavailable":
    "The extra AI check was not available, so this result may miss newer or unusual scams. Treat unexpected requests with care.",
  "result.monster.heading": "The monster behind this trick",
  "result.evidence.heading": "What the hunter found",
  "result.limitsNote":
    "TrickHunt looks for warning signs. It cannot prove that a message is genuine.",
  "result.noSignals.reminderStrong":
    "Nothing was found, but the extra AI check did not run, so this result is weaker. Do not rely on it alone. If a message asks for money, a code or personal details, call the official number yourself.",
  "settings.open": "Settings",
  "input.paste.hint": "Tip: you can paste a screenshot with Ctrl+V.",
  "result.limitations.heading": "Good to know",
  "result.tips.heading": "How to spot this monster",
  "result.tech.summary": "Technical details",
  "result.withheld": "We cannot show this result reliably. Please try again.",
  "result.noSignals.summary": "No warning signs found.",
  "result.noSignals.notSafeNote":
    "No warning signs found does not mean this message is genuine or safe.",
  "result.noSignals.reminder":
    "If a message asks for money, a code or personal details, call the official number yourself to check.",
  "level.no_signals": "Nothing detected yet",
  "level.suspicious": "A few things to double-check",
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

  // Hunter scene, bag and home
  "scene.home.caption": "Tap the hunter to open his bag.",
  "scene.bag.caption":
    "What shall the hunter track in the dark? Put a message, a picture, or both in the bag.",
  "scene.hunt.forest": "The hunter creeps into the dark forest…",
  "scene.hunt.mountain": "He climbs the cold mountain pass, lantern held high…",
  "scene.hunt.swamp": "He wades through the swamp fog, reading the strange marks…",
  "scene.hunt.ruins": "The old ruins ahead. Something moves in the shadows. He takes aim…",
  "scene.reveal.found": "The shadow was a {name}.",
  "scene.reveal.nothing":
    "The trail is quiet. No warning signs found, but still check through official channels.",
  "scene.lost.caption": "The trail went cold. Please try again.",
  "home.hunter.action": "Open the hunter's bag",
  "bag.heading": "The hunter's bag",
  "bag.text.label": "Written message",
  "bag.image.label": "Picture",
  "bag.slot.on": "In the bag",
  "bag.slot.off": "Not in the bag",
  "bag.needOne": "Put a message or a picture in the bag first.",
  "bag.enter.hint": "Press Enter to start. Shift and Enter make a new line.",
  "bag.close": "Close the bag",
  "hunt.again": "Hunt again",
  "result.frame.label": "Hunt report",
  "topbar.language": "Language: {name}. Press to switch to {other}.",

  // Hunter's journal and optional sound
  "journal.title": "The hunter's journal",
  "journal.page1.label": "The hunter's note",
  "journal.page2.label": "Full notes",
  "journal.more": "Read the full notes",
  "journal.back": "Back to the note",
  "journal.moreNotes": "{count} more notes on the next page.",
  "journal.clues.heading": "Warning signs the hunter saw",
  "journal.do.heading": "Do this first",
  "settings.sound.label": "Spooky sound",
  "settings.sound.hint": "Soft wind and a slow heartbeat. Off by default.",

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
  "signal.text.job-offer.explain":
    "The message offers easy pay for little work or asks for a fee to start. Real employers do not charge you to begin. Check the company on its official website.",
  "signal.text.financial-institution.explain":
    "The message asks you to verify or unlock a bank or wallet account. Scammers use this to steal logins. Open your bank's own app or site yourself instead.",
  "signal.url.punycode-host.explain":
    "The web address has traits of a disguised name. It uses unusual characters that can look like normal letters. Do not open it.",
  "signal.url.ip-address-host.explain":
    "The web address is just a string of numbers, not a normal site name. Do not open it.",
  "signal.url.at-in-authority.explain":
    "The web address has an @ sign. This can hide where it really goes. Do not open it.",
  "signal.url.excessive-subdomains.explain":
    "The web address has many parts. This can make the site name hard to read. Do not open it.",
  "signal.url.known-shortener.explain":
    "This is a shortened link, so you cannot see where it leads. Ask the sender for the full address.",
  "signal.url.brand-lookalike.explain":
    "The site name looks almost like a well-known brand. It has traits of a lookalike. Type the real address yourself.",
  "signal.url.credential-keywords.explain":
    "The link has words like login or verify. Pages that ask for passwords often use them. Do not enter your password.",
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
    "A ghost in a banker's coat. It haunts your phone and wants your code, password or card number.",
  "monster.bank.tip1": "It asks for a code or password. Real banks do not.",
  "monster.bank.tip2": "It threatens to lock your account and wants you to act now.",
  "monster.bank.tip3": "It sends a strange link. Open your bank app yourself instead.",
  "monster.prize.name": "Gift Vampire",
  "monster.prize.short": "A vampire with a gift box. It drinks your money and your details.",
  "monster.prize.tip1": "You won a prize you never entered for.",
  "monster.prize.tip2": "It asks you to pay a fee to get the gift.",
  "monster.prize.tip3": "It tells you to reply fast or lose the gift.",
  "monster.job-bait.name": "Job Zombie",
  "monster.job-bait.short": "A zombie that crawls out of the graveyard with an easy job. It wants your deposit or details.",
  "monster.job-bait.tip1": "The work is easy but the pay is very high.",
  "monster.job-bait.tip2": "It asks you to chat on another app, like Telegram or Zalo.",
  "monster.job-bait.tip3": "It asks for a deposit or fee before you start.",
  "monster.authority.name": "Authority Banshee",
  "monster.authority.short":
    "A banshee that wails in an officer's cap. It frightens you into obeying.",
  "monster.authority.tip1": "It says you are linked to a case.",
  "monster.authority.tip2": "It threatens arrest or a fine if you do not act now.",
  "monster.authority.tip3": "It tells you to keep it secret and send money.",
  "monster.generic.name": "Odd Shadow",
  "monster.generic.short":
    "A shadow creeping in the fog. It shows warning signs, but its face is unknown.",
  "monster.generic.tip1": "It comes out of the blue from someone you do not know.",
  "monster.generic.tip2": "It pushes you to hurry.",
  "monster.generic.tip3": "It asks for money, codes or personal details.",
  "monster.neutral.name": "Watchful Candle",
  "monster.neutral.short": "A candle burning low in the dark. No signs yet, but keep watch.",

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
  "link.doppelganger.name": "Doppelganger",
  "link.doppelganger.desc": "This link has traits of a lookalike: its name is very close to a well-known brand.",
  "link.doppelganger.tip1": "Read the name letter by letter. Look for swapped or extra letters.",
  "link.doppelganger.tip2": "Compare it with the address in the brand's official app or on its card.",
  "link.doppelganger.tip3": "Do not open it. Type the brand's address yourself.",
  "link.changeling.name": "Changeling",
  "link.changeling.desc": "This link has traits of a disguised name: it uses unusual letters that look like normal ones.",
  "link.changeling.tip1": "Letters from other alphabets can look the same as English letters.",
  "link.changeling.tip2": "An address that starts with xn-- hides letters like these.",
  "link.changeling.tip3": "Do not open it. Find the real site through the official app.",
  "link.faceless-one.name": "Faceless One",
  "link.faceless-one.desc": "This link has traits of a hidden name: it is a string of numbers, not a site name.",
  "link.faceless-one.tip1": "Numbers stand where a site name should be.",
  "link.faceless-one.tip2": "Well-known companies rarely send people to an address made only of numbers.",
  "link.faceless-one.tip3": "Do not open it. Contact the sender through a number you already trust.",
  "link.masked-stranger.name": "Masked Stranger",
  "link.masked-stranger.desc": "This link has traits of a hidden destination: an @ sign can put the real site after it.",
  "link.masked-stranger.tip1": "The part before the @ sign is not the site.",
  "link.masked-stranger.tip2": "Look at the part after the @ sign. Does it match who sent the message?",
  "link.masked-stranger.tip3": "Do not open it. Ask the sender for the plain address.",
  "link.hydra.name": "Hydra",
  "link.hydra.desc": "This link has traits of a stretched name: many parts can push the real site name out of sight.",
  "link.hydra.tip1": "Read the address from the right. The last two parts usually name the real site.",
  "link.hydra.tip2": "A brand name near the start does not mean the site belongs to that brand.",
  "link.hydra.tip3": "If you are unsure, type the brand's address yourself.",
  "link.cloaked-gate.name": "Cloaked Gate",
  "link.cloaked-gate.desc": "This link has traits of a hidden destination: it is a short link, so you cannot see where it goes.",
  "link.cloaked-gate.tip1": "A short link hides the full address.",
  "link.cloaked-gate.tip2": "Ask the sender for the full address.",
  "link.cloaked-gate.tip3": "If the page asks for a password or money, stop and use the official app instead.",
  "link.wisp.name": "Wisp",
  "link.wisp.desc": "This link has traits of a sign-in page: it contains words like login or verify.",
  "link.wisp.tip1": "Words like login, verify or password in a link are a reason to slow down.",
  "link.wisp.tip2": "Reach a sign-in page through the official site or app.",
  "link.wisp.tip3": "Do not enter a password on a page that a message sent you to.",
  "link.tone.strong.label": "Strong sign",
  "link.tone.strong.explain": "This link has traits that are often used to hide where it really goes. Do not open it. Contact the sender another way.",
  "link.tone.medium.label": "Medium sign",
  "link.tone.medium.explain": "This link has traits that can make the address hard to read. Check it before you trust it.",
  "link.tone.soft.label": "Mild sign",
  "link.tone.soft.explain": "This link has a trait that shows up in scams and in normal messages. Take a moment to check it.",
  "link.badge.caption": "Link trait",
  "link.plain.note": "Shown as plain text. TrickHunt never opens links.",
  "link.plague-mark.name": "Plague Mark",
  "link.plague-mark.desc": "This link has traits of a reported site: it may be on a list of reported sites kept by Google.",
  "link.plague-mark.explain": "This link may be on a list of reported sites. Do not open it. Contact the sender another way.",
  "link.plague-mark.tip1": "Do not open it. Ask the sender for another way to reach them.",
  "link.plague-mark.tip2": "If you already opened it, do not type passwords or card numbers.",
  "link.plague-mark.tip3": "Lists can be wrong. When unsure, use the official app or a number you trust.",
  "reputation.consent.label": "Also check the links against a list of reported sites",
  "reputation.consent.text": "If you tick this box, our server sends a short fingerprint of each link to Google. It does not send your message. This check is optional. TrickHunt never opens your links. No list is complete, and some listings are mistakes.",
  "reputation.notice.unavailable": "We could not check links against the lists this time. The other checks still ran.",
  "reputation.notListed.text": "Not found on the lists we checked.",
  "reputation.notListed.limit": "New and unreported links are not on any list yet, so keep checking with the sender.",
  "reputation.attribution.text": "Advisory provided by Google",
  "reputation.attribution.newTab": "(opens in a new tab)",
  "signal.url.reputation-listed.explain": "This link may be on a list of reported sites kept by Google. Lists can miss sites, and some listings are mistakes. Do not open it.",
  "result.links.heading": "Links in this message",
} as const;

export type MessageKey = keyof typeof en;
