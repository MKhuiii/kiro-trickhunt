/**
 * text-analyzer.v4.test.ts — rules-tuning-v4 phrase additions.
 * Each added phrase fires the intended signal, and wording that only names
 * the thing to refuse or describe (awareness text, maintenance notices,
 * store promotions) does not fire the strong signals.
 */

import { describe, expect, it } from "vitest";
import { TextAnalyzer } from "./text-analyzer";

const analyzer = new TextAnalyzer();

async function ids(text: string): Promise<string[]> {
  return (await analyzer.analyze(text)).map((s) => s.id);
}

const FIRES: ReadonlyArray<readonly [string, string, string]> = [
  // otp-request
  ["text.otp-request", "Please tell us the 6-digit number we send to your phone.", "en"],
  ["text.otp-request", "Reply with the number we send to your phone.", "en"],
  ["text.otp-request", "Vui lòng nhập mã xác nhận gửi về điện thoại.", "vi"],
  // financial-institution
  ["text.financial-institution", "This is the fraud desk calling.", "en"],
  ["text.financial-institution", "Our fraud department blocked a charge.", "en"],
  ["text.financial-institution", "Your debit card was deactivated.", "en"],
  ["text.financial-institution", "Dịch vụ SMS Banking sắp hết hạn.", "vi"],
  // sensitive-data-request
  ["text.sensitive-data-request", "Re-enter your card details at the link.", "en"],
  ["text.sensitive-data-request", "Please confirm your card details now.", "en"],
  ["text.sensitive-data-request", "Hãy nhập lại thông tin thẻ của bạn.", "vi"],
  // threat
  ["text.threat", "Your electricity will be disconnected today.", "en"],
  ["text.threat", "Otherwise you will be detained at the border.", "en"],
  ["text.threat", "Ngày mai sẽ cắt điện nếu bạn không đóng tiền.", "vi"],
  ["text.threat", "Nếu vắng mặt sẽ bị xử lý theo quy định.", "vi"],
  // authority-impersonation
  ["text.authority-impersonation", "Notice from the Immigration Bureau.", "en"],
  ["text.authority-impersonation", "The electricity company sent this notice.", "en"],
  ["text.authority-impersonation", "Tòa án nhân dân quận gửi thông báo.", "vi"],
  ["text.authority-impersonation", "Bạn nhận được giấy mời làm việc.", "vi"],
  // prize-reward
  ["text.prize-reward", "Claim your free reward today.", "en"],
  ["text.prize-reward", "Survey winner, well done.", "en"],
  ["text.prize-reward", "You get a free smartphone.", "en"],
  ["text.prize-reward", "Bạn là khách hàng may mắn tháng này.", "vi"],
  // job-offer
  ["text.job-offer", "Earn a commission per order.", "en"],
  ["text.job-offer", "A remote data entry job is open.", "en"],
  ["text.job-offer", "Bên mình cần người chốt đơn ảo.", "vi"],
  ["text.job-offer", "Chỉ cần ngồi nhà là có thu nhập.", "vi"],
  // payment-request
  ["text.payment-request", "You must prepay the order amount first.", "en"],
  ["text.payment-request", "A refundable deposit is required.", "en"],
  ["text.payment-request", "Bạn cần nạp trước tiền đơn hàng.", "vi"],
  ["text.payment-request", "Đóng phí thẻ nhân viên 200k.", "vi"],
  // off-platform
  ["text.off-platform", "Contact our assistant on Telegram.", "en"],
  ["text.off-platform", "Nhắn Zalo để nhận việc.", "vi"],
  ["text.off-platform", "Nhắn Telegram để nhận hướng dẫn.", "vi"],
];

describe("rules-tuning-v4 added phrases fire the intended signal", () => {
  it.each(FIRES)("%s: %s", async (id, text) => {
    expect(await ids(text)).toContain(id);
  });
});

describe("rules-tuning-v4 does not fire on refusals or ordinary notices", () => {
  it("awareness text that names card details does not fire sensitive-data-request", async () => {
    const text = "We will never call you to ask for your card details.";
    expect(await ids(text)).not.toContain("text.sensitive-data-request");
  });

  it("a planned outage notice stays below a strong signal (threat only)", async () => {
    const found = await ids(
      "Điện lực thông báo: khu vực của bạn sẽ cắt điện từ 8h đến 11h ngày mai để bảo trì.",
    );
    expect(found).not.toContain("text.prize-reward");
    expect(found).not.toContain("text.sensitive-data-request");
    expect(found).not.toContain("text.payment-request");
  });

  it("a store promotion with the word voucher does not fire prize-reward", async () => {
    const found = await ids(
      "Nhận ngay voucher giảm 10% khi mua hàng tại cửa hàng, áp dụng đến hết Chủ nhật.",
    );
    expect(found).not.toContain("text.prize-reward");
  });

  it("an ordinary data entry or order message stays quiet", async () => {
    expect(await ids("Please send the order list by Friday.")).toEqual([]);
    expect(await ids("Mai mình họp lúc 9h nhé.")).toEqual([]);
  });
});

describe("rules-tuning-v5 narrowed prize phrases", () => {
  it.each([
    "Congratulations! You have won a 1000 dollar gift card.",
    "You won a free cruise for two.",
    "Congratulations, you won an iPad.",
    "Chúc mừng bạn trúng thưởng 1000 đô.",
    "Chúc mừng bạn đã trúng thưởng một chiếc xe máy.",
  ])("still fires prize-reward: %s", async (text) => {
    expect(await ids(text)).toContain("text.prize-reward");
  });

  it.each([
    "Congratulations, you won the office raffle! Come to the front desk.",
    "Congratulations on your new job! Dinner on Saturday?",
    "Chúc mừng bạn đã trúng tuyển vào vị trí nhân viên kế toán.",
    "Chúc mừng bạn sinh nhật vui vẻ!",
  ])("does not fire prize-reward: %s", async (text) => {
    expect(await ids(text)).not.toContain("text.prize-reward");
  });
});
