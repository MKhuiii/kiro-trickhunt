/** rules-tuning-v2 example tests (REQ-TXT-22 to REQ-TXT-25). */
import { describe, expect, it } from "vitest";
import { TextAnalyzer } from "./text-analyzer";

const ids = async (text: string) =>
  (await new TextAnalyzer().analyze(text)).map((s) => s.id);

describe("everyday payment words are not signals (REQ-TXT-22)", () => {
  it.each([
    "Can you send money for dinner?",
    "Please transfer money to my sister.",
    "Mai nhớ chuyển khoản tiền ăn trưa nhé",
    "Mình chuyển tiền cho bạn rồi",
    "No fee or paperwork is needed beforehand.",
  ])("%s gives no text.payment-request", async (text) => {
    expect(await ids(text)).not.toContain("text.payment-request");
  });
});

describe("strong payment phrases stay strong (REQ-TXT-23)", () => {
  it.each([
    "pay immediately by gift cards",
    "transfer money to a secure account",
    "Transfer money to a custody account today",
    "A one-time registration fee of $20",
    "Pay the activation fee",
    "only a small processing fee required",
    "hãy chuyển tiền vào tài khoản tạm giữ",
    "Chuyển khoản vào tài khoản an toàn",
    "đóng phí kích hoạt",
  ])("%s gives text.payment-request", async (text) => {
    expect(await ids(text)).toContain("text.payment-request");
  });
});

describe("bank, job and authority phrases (REQ-TXT-24, REQ-TXT-25)", () => {
  it("bank alert context and the texted code", async () => {
    const r = await ids("Unusual sign-in. Confirm your identity and enter the code we text you.");
    expect(r).toContain("text.financial-institution");
    expect(r).toContain("text.otp-request");
  });
  it("a genuine code message stays clean", async () => {
    expect(await ids("Use 739204 to sign in. Never give this code to anyone.")).toEqual([]);
  });
  it("chat migration", async () => {
    expect(await ids("Chat with our manager on WhatsApp")).toContain("text.off-platform");
  });
  it("revenue service, unpaid taxes, warrant, secrecy", async () => {
    const r = await ids(
      "Revenue Service: unpaid taxes. A warrant will be issued. Do not discuss this with anyone.",
    );
    expect(r).toEqual(
      expect.arrayContaining(["text.authority-impersonation", "text.threat", "text.off-platform"]),
    );
  });
  it("bare generic words give no signal", async () => {
    expect(await ids("tax bank money account code")).toEqual([]);
  });
});
