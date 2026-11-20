/**
 * Unit tests for the awareness adjustment (rules-tuning-v5): every fixed
 * condition blocks the adjustment on its own.
 */
import { describe, expect, it } from "vitest";
import { createSignal } from "../core";
import type { Signal } from "../core";
import { applyAwarenessAdjustment, hasCommandVerb, isReportedOnly } from "./awareness";
import type { AwarenessInput } from "./awareness";
import { AWARENESS_MAX_SCORE, AWARENESS_MIN_SEVERITY } from "./awareness.config";

const WARNING =
  "Fraud alert: scammers are sending fake texts saying your account has been locked and asking you to verify within 24 hours. Ignore them and use the official app.";

function sig(id: string, severity = 0.4): Signal {
  const source = id.startsWith("url.") ? "url" : id.startsWith("semantic.") ? "semantic" : "text";
  return createSignal({ id, source, severity, evidence: "e", whyItMatters: "w" });
}

function base(over: Partial<AwarenessInput> = {}): AwarenessInput {
  return {
    enabled: true,
    score: 58,
    level: "high",
    signals: [sig("text.threat"), sig("text.urgency", 0.3)],
    text: WARNING,
    inputUrls: [],
    semanticStatus: "ok",
    awareness: { severity: 0.9 },
    ...over,
  };
}

describe("applyAwarenessAdjustment", () => {
  it("lowers a genuine warning from high to suspicious with a capped score", () => {
    const out = applyAwarenessAdjustment(base());
    expect(out).toEqual({
      score: AWARENESS_MAX_SCORE,
      level: "suspicious",
      applied: true,
      reason: "applied",
    });
  });

  it("never raises the score when it is already below the cap", () => {
    const out = applyAwarenessAdjustment(base({ score: 50 }));
    expect(out.score).toBe(Math.min(50, AWARENESS_MAX_SCORE));
  });

  const blocked: ReadonlyArray<readonly [string, Partial<AwarenessInput>, string]> = [
    ["switched off", { enabled: false }, "disabled"],
    ["no marker", { awareness: null }, "no-marker"],
    ["semantic degraded", { semanticStatus: "degraded" }, "semantic-not-ok"],
    ["semantic unavailable", { semanticStatus: "unavailable" }, "semantic-not-ok"],
    ["weak marker", { awareness: { severity: AWARENESS_MIN_SEVERITY - 0.01 } }, "marker-too-weak"],
    ["level critical", { level: "critical", score: 90 }, "level-not-high"],
    ["level suspicious", { level: "suspicious", score: 40 }, "level-not-high"],
    ["level no_signals", { level: "no_signals", score: 0 }, "level-not-high"],
    [
      "no warning cue",
      { text: "Your account has been locked. Verify within 24 hours." },
      "no-warning-cue",
    ],
    ["link in text", { text: `${WARNING} https://bank-help.example` }, "has-link-or-number"],
    ["separate url", { inputUrls: ["https://bank-help.example"] }, "has-link-or-number"],
    ["phone number", { text: `${WARNING} Hotline 0000 000 000.` }, "has-link-or-number"],
    ["url signal", { signals: [sig("text.threat"), sig("url.credential-keywords")] }, "blocking-signal"],
    ["otp request", { signals: [sig("text.threat"), sig("text.otp-request")] }, "blocking-signal"],
    ["payment request", { signals: [sig("text.threat"), sig("text.payment-request")] }, "blocking-signal"],
    ["off-platform", { signals: [sig("text.threat"), sig("text.off-platform")] }, "blocking-signal"],
    ["prize", { signals: [sig("text.threat"), sig("text.prize-reward")] }, "blocking-signal"],
    ["any semantic sign", { signals: [sig("text.threat"), sig("semantic.pressure-escalation")] }, "blocking-signal"],
    ["reply request", { text: `${WARNING} Reply YES to confirm.` }, "contact-request"],
    ["call back request", { text: `${WARNING} Please call us back today.` }, "contact-request"],
    ["vi call back", { text: "Cảnh báo lừa đảo: tài khoản bị khóa. Gọi lại tổng đài ngay." }, "contact-request"],
    ["command verb", { text: `${WARNING} Visit any branch today.` }, "command-verb"],
    ["vi polite command", { text: "Cảnh báo lừa đảo, tài khoản sẽ bị khóa, vui lòng đến quầy giao dịch." }, "command-verb"],
  ];

  it.each(blocked)("does not lower when %s", (_name, over, reason) => {
    const input = base(over);
    const out = applyAwarenessAdjustment(input);
    expect(out.applied).toBe(false);
    expect(out.reason).toBe(reason);
    expect(out.level).toBe(input.level);
    expect(out.score).toBe(input.score);
  });
});

describe("reported payment phrases", () => {
  const NEWS =
    "Bài viết: Công an cảnh báo thủ đoạn giả danh cán bộ yêu cầu chuyển tiền vào tài khoản tạm giữ. Mọi người cẩn thận nhé!";

  it("lowers a news warning that only describes the payment tactic", () => {
    const out = applyAwarenessAdjustment(
      base({
        score: 80,
        text: NEWS,
        signals: [sig("text.payment-request"), sig("text.authority-impersonation", 0.35)],
      }),
    );
    expect(out).toEqual({
      score: AWARENESS_MAX_SCORE,
      level: "suspicious",
      applied: true,
      reason: "applied",
    });
  });

  it("still blocks when a separate clause asks for payment", () => {
    const text = `${NEWS} Quý khách cần chuyển tiền vào tài khoản tạm giữ trước 17h.`;
    const out = applyAwarenessAdjustment(base({ text, signals: [sig("text.payment-request")] }));
    expect(out.reason).toBe("blocking-signal");
  });

  it("still blocks when the LLM adds any semantic sign", () => {
    const out = applyAwarenessAdjustment(
      base({ text: NEWS, signals: [sig("text.payment-request"), sig("semantic.pressure-escalation")] }),
    );
    expect(out.reason).toBe("blocking-signal");
  });

  it.each([
    NEWS,
    "Ngân hàng không bao giờ yêu cầu chuyển tiền vào tài khoản an toàn.",
    "Scam warning: scammers ask you to transfer money to a safe account.",
  ])("treats the payment phrase as reported in: %s", (text) => {
    expect(isReportedOnly("text.payment-request", text)).toBe(true);
  });

  it.each([
    ["no cue in the asking clause", "Kẻ gian giả danh công an. Quý khách cần chuyển tiền vào tài khoản tạm giữ."],
    ["cue after the phrase", "Quý khách cần chuyển tiền vào tài khoản tạm giữ vì đây là thủ đoạn mới"],
    ["cue in another clause", "Thủ đoạn mới, quý khách cần chuyển tiền vào tài khoản tạm giữ"],
    ["accent look-alike of chiêu", "Chiều nay quý khách cần chuyển tiền vào tài khoản tạm giữ"],
    ["phrase across a clause break", "Thủ đoạn này buộc bạn chuyển tiền. Ngay hôm nay"],
    ["line break splits the clause", "Thủ đoạn lừa đảo mới\nQuý khách cần chuyển tiền vào tài khoản tạm giữ"],
    ["no payment phrase at all", "Thủ đoạn giả danh công an."],
  ])("does not treat it as reported when %s", (_name, text) => {
    expect(isReportedOnly("text.payment-request", text)).toBe(false);
  });

  it("never exempts ids outside REPORTABLE_SIGNAL_IDS", () => {
    expect(isReportedOnly("text.otp-request", "Kẻ gian yêu cầu cung cấp mã OTP.")).toBe(false);
  });
});

describe("hasCommandVerb", () => {
  it.each([
    "Visit any branch today.",
    "To unlock it, verify your account.",
    "Please confirm your details.",
    "Act now to avoid arrest.",
    "Vui lòng đến quầy giao dịch gần nhất.",
    "Khẩn cấp, hãy làm theo hướng dẫn.",
    "And send the money tonight.",
  ])("finds a command in: %s", (text) => {
    expect(hasCommandVerb(text)).toBe(true);
  });

  it.each([
    "Scammers ask you to verify within 24 hours.",
    "Ignore them and use the official app.",
    "These texts are fake.",
    "Đây là tin nhắn giả mạo, hãy bỏ qua và dùng ứng dụng chính thức.",
  ])("finds no command in: %s", (text) => {
    expect(hasCommandVerb(text)).toBe(false);
  });
});
