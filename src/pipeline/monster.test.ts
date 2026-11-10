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
    // bank 3 vs prize 3
    expect(
      selectMonster("high", [sig("text.otp-request"), sig("text.prize-reward")]),
    ).toBe("bank");
    // prize 3 vs job-bait 3
    expect(
      selectMonster("high", [
        sig("text.prize-reward"),
        sig("semantic.relationship-or-job-bait"),
      ]),
    ).toBe("prize");
    // job-bait 2 vs authority 2 (bank gets 1 from impersonation)
    expect(
      selectMonster("high", [sig("text.off-platform"), sig("text.threat")]),
    ).toBe("job-bait");
  });

  it("a higher total beats an earlier monster in order", () => {
    // authority 2+2 = 4 beats bank 1
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
