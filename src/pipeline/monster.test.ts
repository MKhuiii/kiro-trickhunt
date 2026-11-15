import { describe, expect, it } from "vitest";

import { createSignal } from "../core";
import type { Signal } from "../core";

import { selectMonster } from "./monster";

function sig(id: string, severity = 0.5): Signal {
  return createSignal({
    id,
    source: id.startsWith("url.") ? "url" : id.startsWith("semantic.") ? "semantic" : "text",
    severity,
    evidence: "ev",
    whyItMatters: "because",
  });
}

describe("selectMonster", () => {
  it("returns null for no_signals", () => {
    expect(selectMonster("no_signals", [])).toBeNull();
    expect(selectMonster("no_signals", [sig("text.otp-request")])).toBeNull();
  });

  it("returns generic when no monster reaches the threshold", () => {
    expect(selectMonster("suspicious", [sig("text.urgency")])).toBe("generic");
    // bank weight 1 only, below threshold 2
    expect(selectMonster("suspicious", [sig("url.credential-keywords")])).toBe("generic");
  });

  it("returns generic for an IP-only URL signal", () => {
    expect(selectMonster("suspicious", [sig("url.ip-host")])).toBe("generic");
  });

  it("picks bank for the bank sample", () => {
    const signals = [
      sig("text.otp-request"),
      sig("url.brand-lookalike"),
      sig("text.urgency"),
    ];
    expect(selectMonster("high", signals)).toBe("bank");
  });

  it("breaks ties by MONSTER_ORDER", () => {
    // bank 2, prize 1, job-bait 1: bank wins on total (not a tie any more)
    expect(
      selectMonster("high", [
        sig("text.sensitive-data-request"),
        sig("semantic.too-good-to-be-true"),
      ]),
    ).toBe("bank");
    // prize 3 vs job-bait 1: prize wins on total (not a tie any more)
    expect(
      selectMonster("high", [
        sig("text.prize-reward"),
        sig("semantic.relationship-or-job-bait"),
      ]),
    ).toBe("prize");
    // job-bait 2 (off-platform 1 + payment-request 1) vs authority 2
    // (off-platform 1 + payment-request 1): tie won by MONSTER_ORDER
    expect(
      selectMonster("high", [sig("text.off-platform"), sig("text.payment-request")]),
    ).toBe("job-bait");
  });

  it("text.job-offer alone gives generic; with text.off-platform it gives job-bait", () => {
    expect(selectMonster("suspicious", [sig("text.job-offer")])).toBe("generic");
    expect(
      selectMonster("suspicious", [sig("text.job-offer"), sig("text.off-platform")]),
    ).toBe("job-bait");
  });

  it("two signals of one overlap group at suspicious give generic (REQ-PIPE-67)", () => {
    expect(
      selectMonster("suspicious", [
        sig("text.job-offer"),
        sig("semantic.relationship-or-job-bait"),
      ]),
    ).toBe("generic");
    // the same pair at high keeps the specific monster
    expect(
      selectMonster("high", [
        sig("text.job-offer"),
        sig("semantic.relationship-or-job-bait"),
      ]),
    ).toBe("job-bait");
  });

  it("a higher total beats an earlier monster in order", () => {
    // authority 1 + 1 = 2 beats bank 1
    expect(
      selectMonster("high", [sig("text.authority-impersonation"), sig("text.threat")]),
    ).toBe("authority");
  });

  it("counts distinct signal ids once", () => {
    // duplicates of otp-request must not make bank (3) outweigh prize (3+2=5)
    const signals = [
      sig("text.otp-request"),
      sig("text.otp-request", 0.9),
      sig("text.otp-request", 0.7),
      sig("text.prize-reward"),
      sig("semantic.too-good-to-be-true"),
    ];
    expect(selectMonster("high", signals)).toBe("prize");
  });

  it("a single duplicated weight-1 id stays below threshold", () => {
    const signals = [sig("url.credential-keywords"), sig("url.credential-keywords")];
    expect(selectMonster("suspicious", signals)).toBe("generic");
  });
});
