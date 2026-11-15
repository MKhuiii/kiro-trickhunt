/**
 * Property tests PBT-76 and PBT-80 (rules-tuning-v1), rules-only pipeline.
 *
 * Imports only from src/pipeline and src/core (REQ-PIPE-47), so the phrases
 * added by this spec are listed locally instead of read from the analyzer config.
 */

import fc from "fast-check";
import { describe, it } from "vitest";
import { createPipeline } from "../index";
import { EVAL_SAMPLES } from "./samples";

const pipeline = createPipeline({ llmClient: null });

const BENIGN = EVAL_SAMPLES.filter((s) => s.expectedMonster === null);

/** Phrases added by rules-tuning-v1 (design.md "Changes"). */
const NEW_PHRASES: readonly string[] = [
  // text.otp-request
  "send me the otp", "send me your otp", "send us your code", "reply with the otp",
  "reply with your code", "text me the code", "tell me the code", "read me the code",
  "vui lòng cung cấp mã otp", "vui lòng gửi mã otp", "hãy gửi mã otp", "và cung cấp mã otp",
  "gửi lại mã otp", "trả lời mã otp",
  // text.urgency
  "within 72 hours", "within 1 hour", "within an hour", "locked in 24 hours",
  "suspended in 48 hours", "closed in 24 hours", "trong 24h", "trong 48 giờ",
  "trong vòng 1 giờ", "trong vòng 2 giờ",
  // text.payment-request
  "pay a small fee", "pay a small shipping fee", "pay the shipping fee", "pay a handling fee",
  "pay a registration fee", "pay a training deposit", "pay the release fee",
  "trả phí vận chuyển", "đóng phí đăng ký", "nộp tiền cọc",
  // text.off-platform
  "message us on telegram", "contact us on whatsapp", "add me on whatsapp", "nhắn tin qua telegram",
  // text.threat
  "you are under investigation", "đang bị điều tra",
  // text.job-offer
  "easy tasks", "simple tasks", "no experience needed", "hiring online", "earn money online",
  "make money online", "easy money", "liking videos", "nhiệm vụ đơn giản",
  "việc nhẹ lương cao", "không cần kinh nghiệm", "kiếm tiền online", "thu nhập mỗi ngày",
  // text.financial-institution
  "verify your account", "account verification", "confirm your account", "unlock your account",
  "e-wallet", "digital wallet", "xác minh tài khoản", "mở khóa tài khoản", "ví điện tử",
];

const BASE_TEXTS: readonly string[] = [
  ...EVAL_SAMPLES.map((s) => s.text),
  ...NEW_PHRASES,
  ...NEW_PHRASES.map((p) => `Notice: ${p}.`),
];

const OTP_PROHIBITIONS = [
  "Do not share your OTP",
  "Never share this code",
  "Không cung cấp mã OTP",
] as const;

describe("rules-tuning-v1 eval properties", () => {
  /**
   * PBT-76: appending a benign sentence never lowers riskScore.
   * **Validates: Requirements REQ-PIPE-46**
   */
  it("PBT-76: appending a benign sentence never lowers riskScore", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...BASE_TEXTS),
        fc.constantFrom(...BENIGN.map((s) => s.text)),
        async (base, benign) => {
          const before = await pipeline.run({ text: base });
          const after = await pipeline.run({ text: `${base} ${benign}` });
          return after.riskScore >= before.riskScore;
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * PBT-80: OTP prohibition sentences never produce text.otp-request.
   * **Validates: Requirements REQ-TXT-17**
   */
  it("PBT-80: OTP prohibition sentences never produce text.otp-request", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...BENIGN.map((s) => s.text)),
        fc.constantFrom(...OTP_PROHIBITIONS),
        async (benign, prohibition) => {
          const verdict = await pipeline.run({ text: `${benign} ${prohibition}.` });
          return !verdict.signals.some((s) => s.id === "text.otp-request");
        },
      ),
      { numRuns: 100 },
    );
  });
});
