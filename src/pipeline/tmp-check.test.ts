import { it, expect } from "vitest";
import { createPipeline } from "./index";

const samples = [
  "[Ngân hàng ABC] Tài khoản của quý khách sẽ bị khóa trong 24h. Vui lòng xác minh tại http://abc-bank-verify.example/login và cung cấp mã OTP.",
  "Tôi là cán bộ công an, bạn liên quan vụ rửa tiền. Không được nói với ai, chuyển tiền vào tài khoản an toàn.",
  "Chúc mừng bạn trúng thưởng 1000 đô. Trả phí vận chuyển trong 1 giờ để nhận quà.",
  "Mai 8h họp nhóm ở phòng 302 nhé, nhớ mang laptop.",
  "Số dư tài khoản của bạn đã thay đổi. Xem chi tiết trong ứng dụng ngân hàng.",
  "http://192.168.1.1/login",
];

it("in kết quả mẫu", async () => {
  const p = createPipeline({ llmClient: null });
  for (const text of samples) {
    const v = await p.run({ text });
    console.log(v.level, v.riskScore, v.monster, v.signals.map((s) => s.id).join(","));
    expect(JSON.stringify(v).toLowerCase()).not.toContain('"safe"');
  }
});