import type { MessageKey } from "./en";

/**
 * Vietnamese dictionary. DRAFT translation, pending human review.
 * Typed against `MessageKey` so a missing or extra key is a compile error.
 */
export const vi: Record<MessageKey, string> = {
  // App, input, progress, privacy
  "app.name": "TrickHunt",
  "app.tagline": "Kiểm tra tin nhắn lạ trước khi bạn trả lời.",
  "input.text.label": "Dán tin nhắn hoặc đường dẫn cần kiểm tra",
  "input.text.hint": "Bạn có thể dán cả tin nhắn. Chúng tôi sẽ tự tìm đường dẫn trong đó.",
  "input.image.label": "Chọn ảnh chụp màn hình hoặc mã QR",
  "input.image.hint": "Bạn cũng có thể kéo ảnh vào đây hoặc dán ảnh.",
  "input.image.selected": "Đã chọn một ảnh.",
  "input.image.remove": "Bỏ ảnh đã chọn",
  "input.submit": "Kiểm tra",
  "input.reset": "Kiểm tra tin khác",
  "input.empty": "Hãy dán tin nhắn hoặc chọn một ảnh để bắt đầu.",
  "progress.preparing": "Đang chuẩn bị ảnh…",
  "progress.qr": "Đang tìm mã QR…",
  "progress.ocr.loading": "Đang tải công cụ đọc chữ…",
  "progress.ocr.recognizing": "Đang đọc chữ trong ảnh: {percent}%",
  "progress.sending": "Đang tìm các dấu hiệu cảnh báo…",
  "progress.done": "Đã có kết quả.",
  "progress.nothing": "Không có gì để kiểm tra. Hãy thêm tin nhắn hoặc ảnh.",
  "privacy.note":
    "Ảnh của bạn không rời khỏi máy. Chỉ chữ và đường dẫn được gửi đi để kiểm tra, và chúng tôi không lưu lại.",
  "a11y.skip": "Đến nội dung chính",
  "a11y.result-ready": "Đã có kết quả: {level}",

  // Preferences
  "prefs.heading": "Tùy chỉnh",
  "prefs.language": "Ngôn ngữ",
  "prefs.language.vi": "Tiếng Việt",
  "prefs.language.en": "English",
  "prefs.textSize": "Cỡ chữ",
  "prefs.textSize.100": "Chữ thường",
  "prefs.textSize.125": "Chữ lớn",
  "prefs.textSize.150": "Chữ rất lớn",
  "prefs.reduceMotion": "Giảm chuyển động",
  "prefs.highContrast": "Tương phản cao",

  // Result, levels, sources, semantic notes
  "result.heading": "Kết quả kiểm tra",
  "result.meter.label": "Mức nguy cơ: {percent} trên 100",
  "result.message.heading": "Tin nhắn của bạn",
  "result.message.note": "Phần được tô sáng là chỗ chúng tôi thấy dấu hiệu lạ.",
  "result.highlight.srLabel": "Đoạn đáng ngờ:",
  "result.signals.heading": "Vì sao chúng tôi thấy lạ",
  "result.evidence.label": "Chỗ đáng ngờ:",
  "result.severity.low": "Mức nhẹ",
  "result.severity.medium": "Mức vừa",
  "result.severity.high": "Mức nặng",
  "result.actions.heading": "Bạn nên làm gì",
  "result.limitations.heading": "Điều cần nhớ",
  "result.tips.heading": "Cách nhận ra",
  "result.tech.summary": "Chi tiết kỹ thuật",
  "result.withheld": "Chúng tôi chưa thể hiển thị kết quả này một cách đáng tin. Hãy thử kiểm tra lại.",
  "result.noSignals.summary": "Chưa thấy dấu hiệu cảnh báo nào.",
  "result.noSignals.notSafeNote":
    "Chưa thấy dấu hiệu cảnh báo không có nghĩa là tin nhắn này là thật hay an toàn.",
  "result.noSignals.reminder":
    "Nếu tin nhắn đòi tiền, mã xác nhận hoặc thông tin cá nhân, hãy tự gọi số điện thoại chính thức để hỏi lại.",
  "level.no_signals": "Chưa phát hiện dấu hiệu nào",
  "level.suspicious": "Có vài dấu hiệu cần để ý",
  "level.high": "Nhiều dấu hiệu cảnh báo, hãy cẩn thận",
  "level.critical": "Dấu hiệu rất mạnh của lừa đảo",
  "source.text": "Trong nội dung tin nhắn",
  "source.url": "Trong đường dẫn",
  "source.semantic": "Trong cách diễn đạt",
  "source.image": "Trong ảnh",
  "source.qr": "Trong mã QR",
  "source.other": "Dấu hiệu khác",
  "semantic.used": "Chúng tôi có dùng thêm một bước đọc hiểu ngôn ngữ.",
  "semantic.skipped": "Lần này chỉ dùng các bước kiểm tra có sẵn.",
  "semantic.budget-exhausted":
    "Bước đọc hiểu ngôn ngữ đang quá tải, nên chỉ dùng các bước kiểm tra có sẵn.",
  "semantic.not-configured":
    "Bước đọc hiểu ngôn ngữ hiện chưa bật, nên chỉ dùng các bước kiểm tra có sẵn.",
  "semantic.degraded":
    "Bước đọc hiểu ngôn ngữ không hoàn tất, nên chỉ dùng các bước kiểm tra có sẵn.",

  // Signal explanations
  "signal.text.otp-request.explain":
    "Tin nhắn xin mã xác nhận hoặc mật khẩu. Ngân hàng thật không xin những thứ này qua tin nhắn. Đừng chia sẻ chúng.",
  "signal.text.urgency.explain":
    "Tin nhắn thúc bạn làm thật nhanh. Kẻ lừa đảo muốn bạn không có thời gian suy nghĩ. Hãy bình tĩnh và kiểm tra trước.",
  "signal.text.threat.explain":
    "Tin nhắn dọa bạn, ví dụ khóa tài khoản hoặc phạt tiền. Cơ quan thật không làm vậy qua tin nhắn. Đừng làm theo.",
  "signal.text.prize-reward.explain":
    "Tin nhắn nói bạn trúng thưởng, được quà hoặc hoàn tiền. Nếu bạn không tham gia gì thì rất khó là thật.",
  "signal.text.payment-request.explain":
    "Tin nhắn đòi bạn chuyển tiền hoặc nộp phí. Tiền đã chuyển cho kẻ lừa đảo rất khó lấy lại. Hãy xác nhận qua số điện thoại đáng tin trước.",
  "signal.text.authority-impersonation.explain":
    "Tin nhắn nói là của ngân hàng, công an hay cơ quan thuế. Kẻ lừa đảo giả danh để bạn tin. Hãy gọi đến số do chính bạn tìm.",
  "signal.text.off-platform.explain":
    "Tin nhắn rủ bạn sang ứng dụng khác hoặc giữ bí mật. Như vậy sẽ không ai kịp cảnh báo bạn. Hãy nói chuyện với người bạn tin.",
  "signal.text.sensitive-data-request.explain":
    "Tin nhắn xin số thẻ, giấy tờ hoặc mật khẩu ngân hàng. Kẻ xấu có thể dùng chúng để lấy tiền của bạn. Đừng gửi.",
  "signal.url.punycode-host.explain":
    "Địa chỉ web dùng ký tự lạ để trông giống một trang thật. Đừng mở nó.",
  "signal.url.ip-address-host.explain":
    "Địa chỉ web chỉ là một dãy số, không phải tên trang web thông thường. Đừng mở nó.",
  "signal.url.at-in-authority.explain":
    "Địa chỉ web có ký tự @ để giấu nơi nó thật sự dẫn đến. Đừng mở nó.",
  "signal.url.excessive-subdomains.explain":
    "Địa chỉ web có quá nhiều phần. Điều này có thể làm trang giả trông như thật. Đừng mở nó.",
  "signal.url.known-shortener.explain":
    "Đây là đường dẫn rút gọn nên bạn không biết nó dẫn đến đâu. Hãy hỏi người gửi địa chỉ đầy đủ.",
  "signal.url.brand-lookalike.explain":
    "Tên trang web gần giống một thương hiệu nổi tiếng nhưng không phải trang thật. Hãy tự gõ địa chỉ thật.",
  "signal.url.credential-keywords.explain":
    "Đường dẫn có chữ như login hoặc verify. Trang giả lấy mật khẩu hay dùng các chữ này. Đừng nhập mật khẩu.",
  "signal.semantic.impersonation-tone.explain":
    "Giọng văn giống ngân hàng hoặc cơ quan nhưng có chỗ không đúng. Hãy tự gọi số chính thức để hỏi.",
  "signal.semantic.emotional-manipulation.explain":
    "Tin nhắn đánh vào nỗi sợ hoặc lòng thương để bạn làm theo ngay. Hãy dừng lại và hỏi người bạn tin.",
  "signal.semantic.too-good-to-be-true.explain":
    "Lời hứa quá hấp dẫn so với công sức bỏ ra. Cơ hội thật hiếm khi tự tìm đến bạn. Hãy kiểm tra công ty trên trang web chính thức.",
  "signal.semantic.isolation-secrecy.explain":
    "Tin nhắn bảo bạn đừng nói với người thân hay ngân hàng. Kẻ lừa đảo làm vậy để không ai cản bạn. Hãy kể cho người bạn tin.",
  "signal.semantic.relationship-or-job-bait.explain":
    "Một người lạ tỏ ra thân thiện hoặc mời việc dễ kiếm tiền. Đây có thể là cách lấy lòng tin trước khi xin tiền. Hãy tìm hiểu họ là ai trước.",
  "signal.semantic.pressure-escalation.explain":
    "Tin nhắn càng lúc càng thúc ép bạn. Cơ quan thật thường cho bạn thời gian. Hãy kiểm tra trước khi trả lời.",
  "signal.unknown.explain":
    "Chúng tôi thấy một dấu hiệu lạ trong nội dung này. Hãy hỏi lại người gửi bằng cách bạn tin tưởng.",

  // Monsters
  "monster.bank.name": "Bóng ma ngân hàng",
  "monster.bank.short": "Giả làm ngân hàng để xin mã, mật khẩu hoặc số thẻ của bạn.",
  "monster.bank.tip1": "Nó xin mã hoặc mật khẩu. Ngân hàng thật không xin.",
  "monster.bank.tip2": "Nó dọa khóa tài khoản và bắt bạn làm ngay.",
  "monster.bank.tip3": "Nó gửi đường dẫn lạ. Hãy tự mở ứng dụng ngân hàng thay vì bấm vào.",
  "monster.prize.name": "Ma cà rồng quà tặng",
  "monster.prize.short": "Hứa cho bạn quà hoặc giải thưởng để hút tiền và thông tin của bạn.",
  "monster.prize.tip1": "Bạn trúng thưởng dù chưa tham gia gì.",
  "monster.prize.tip2": "Nó đòi bạn trả phí để nhận quà.",
  "monster.prize.tip3": "Nó bảo bạn trả lời gấp kẻo mất quà.",
  "monster.job-bait.name": "Xác sống việc làm",
  "monster.job-bait.short": "Mời việc nhẹ lương cao để lấy tiền cọc hoặc thông tin của bạn.",
  "monster.job-bait.tip1": "Việc nhẹ mà lương rất cao.",
  "monster.job-bait.tip2": "Nó rủ bạn sang ứng dụng khác như Telegram hoặc Zalo để nói chuyện.",
  "monster.job-bait.tip3": "Nó đòi tiền cọc hoặc phí trước khi bạn đi làm.",
  "monster.authority.name": "Ma nữ khẩn cấp",
  "monster.authority.short": "Giả làm công an hay cơ quan nhà nước để dọa bạn phải làm theo.",
  "monster.authority.tip1": "Nó nói bạn có liên quan đến một vụ việc.",
  "monster.authority.tip2": "Nó dọa bắt hoặc phạt nếu bạn không làm ngay.",
  "monster.authority.tip3": "Nó bảo bạn giữ bí mật và chuyển tiền.",
  "monster.generic.name": "Bóng lạ",
  "monster.generic.short":
    "Tin nhắn có dấu hiệu lạ nhưng chưa giống một kiểu lừa đảo quen thuộc.",
  "monster.generic.tip1": "Nó đến bất ngờ từ người bạn không quen.",
  "monster.generic.tip2": "Nó thúc bạn làm thật nhanh.",
  "monster.generic.tip3": "Nó xin tiền, mã hoặc thông tin cá nhân.",
  "monster.neutral.name": "Ngọn nến canh gác",
  "monster.neutral.short": "Chưa có dấu hiệu nào, nhưng bạn vẫn nên cẩn thận.",

  // Notices
  "notice.ocr-skipped": "Chúng tôi đã bỏ qua bước đọc chữ vì ảnh có mã QR.",
  "notice.ocr-too-poor":
    "Chữ trong ảnh quá mờ nên chúng tôi không đọc được. Hãy thử ảnh rõ hơn hoặc dán chữ vào.",
  "notice.ocr-failed": "Chúng tôi không đọc được chữ trong ảnh. Hãy thử lại hoặc dán chữ vào.",
  "notice.payment-qr":
    "Đây là mã QR thanh toán. Chúng tôi không kiểm tra nội dung của nó. Đừng quét nếu bạn không chắc.",
  "notice.wifi-qr": "Đây là mã QR kết nối Wi-Fi. Chúng tôi không kiểm tra nội dung của nó.",
  "notice.no-url": "Mã QR này không có đường dẫn web nên chúng tôi không kiểm tra được.",
  "notice.text-truncated": "Tin nhắn quá dài. Chúng tôi chỉ kiểm tra phần đầu.",
  "notice.urls-skipped": "Có {count} đường dẫn chưa được kiểm tra vì có quá nhiều.",
  "notice.generic": "Có một lưu ý khác về kết quả này.",

  // Errors
  "error.analyze.invalid-input": "Nội dung chưa hợp lệ. Hãy kiểm tra lại tin nhắn rồi thử lại.",
  "error.analyze.payload-too-large": "Nội dung quá dài. Hãy rút ngắn rồi thử lại.",
  "error.analyze.invalid-content-type": "Có lỗi khi gửi nội dung. Hãy tải lại trang rồi thử lại.",
  "error.analyze.rate-limited": "Bạn kiểm tra hơi nhiều lần. Hãy đợi {seconds} giây rồi thử lại.",
  "error.analyze.internal-error": "Hệ thống đang gặp sự cố. Hãy thử lại sau ít phút.",
  "error.analyze.network-error": "Không kết nối được mạng. Hãy kiểm tra mạng rồi thử lại.",
  "error.analyze.timeout": "Việc kiểm tra mất quá lâu. Hãy thử lại.",
  "error.analyze.bad-response": "Chúng tôi nhận được kết quả không đọc được. Hãy thử lại.",
  "error.analyze.unexpected-status": "Hệ thống trả lời không như mong đợi. Hãy thử lại sau.",
  "error.ingest.unsupported-type": "Định dạng tệp này chưa được hỗ trợ. Hãy dùng PNG, JPG hoặc WebP.",
  "error.ingest.invalid-size": "Tệp ảnh trống hoặc bị lỗi. Hãy chọn ảnh khác.",
  "error.ingest.file-too-large": "Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn {maxMb} MB.",
  "error.ingest.decode-failed": "Chúng tôi không mở được ảnh này. Hãy thử ảnh khác.",
  "error.ingest.too-many-pixels": "Ảnh có độ phân giải quá cao. Hãy chọn ảnh nhỏ hơn.",
  "error.ingest.canvas-unavailable":
    "Trình duyệt của bạn không xử lý được ảnh. Hãy thử trình duyệt khác hoặc dán chữ vào.",
  "error.ingest.ocr-engine-unavailable": "Không tải được công cụ đọc chữ. Hãy dán chữ vào ô nhập.",
  "error.ingest.ocr-timeout":
    "Đọc chữ trong ảnh mất quá lâu. Hãy thử ảnh nhỏ hơn hoặc dán chữ vào.",
  "error.ingest.ocr-aborted": "Đã dừng việc đọc chữ.",
  "error.ingest.ocr-failed": "Chúng tôi không đọc được chữ trong ảnh. Hãy dán chữ vào ô nhập.",
  "error.ingest.qr-engine-unavailable": "Không tải được công cụ đọc mã QR. Hãy thử lại sau.",
  "error.ingest.qr-decode-failed": "Chúng tôi không đọc được mã QR trong ảnh. Hãy thử ảnh rõ hơn.",
  "error.ingest.unexpected": "Có lỗi không mong muốn. Hãy thử lại.",
  "error.generic": "Có lỗi xảy ra. Hãy thử lại.",
  "error.technical.label": "Mã lỗi: {code}",
};
