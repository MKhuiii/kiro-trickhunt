/** rules-tuning-v3 example tests (REQ-TXT-27 to REQ-TXT-31). */
import { describe, expect, it } from "vitest";
import { TextAnalyzer } from "./text-analyzer";

const ids = async (text: string) =>
  (await new TextAnalyzer().analyze(text)).map((s) => s.id);

describe("weak payment phrases no longer fire (REQ-TXT-27)", () => {
  it.each([
    "pay immediately by gift cards",
    "A one-time registration fee of $20",
    "only a small processing fee required",
  ])("%s gives no text.payment-request", async (text) => {
    expect(await ids(text)).not.toContain("text.payment-request");
  });

  it("pay the registration fee gives text.payment-request", async () => {
    expect(await ids("pay the registration fee")).toContain("text.payment-request");
  });
});

describe("gift cards need a buying verb (REQ-TXT-28)", () => {
  it("buy gift cards fires", async () => {
    expect(await ids("buy gift cards")).toContain("text.payment-request");
  });
  it("We sell gift cards does not", async () => {
    expect(await ids("We sell gift cards")).not.toContain("text.payment-request");
  });
});

describe("password requests (REQ-TXT-29)", () => {
  it("send me your password fires", async () => {
    expect(await ids("send me your password")).toContain("text.otp-request");
  });
  it("change your password in Settings does not", async () => {
    expect(await ids("change your password in Settings")).not.toContain("text.otp-request");
  });
});

describe("urgency deadlines (REQ-TXT-30)", () => {
  it("reply within 24 hours fires", async () => {
    expect(await ids("reply within 24 hours")).toContain("text.urgency");
  });
  it("delivered within 24 hours does not", async () => {
    expect(await ids("delivered within 24 hours")).not.toContain("text.urgency");
  });
});

describe("threats and job offers (REQ-TXT-31)", () => {
  it("your unpaid taxes fires", async () => {
    expect(await ids("your unpaid taxes")).toContain("text.threat");
  });
  it("I still have unpaid taxes does not", async () => {
    expect(await ids("I still have unpaid taxes")).not.toContain("text.threat");
  });
  it("with easy tasks fires", async () => {
    expect(await ids("with easy tasks")).toContain("text.job-offer");
  });
  it("a few easy tasks around the house does not", async () => {
    expect(await ids("a few easy tasks around the house")).not.toContain("text.job-offer");
  });
});
