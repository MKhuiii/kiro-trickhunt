import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source scan of the docs and steering files (REQ-LREP-64, 65, 66).

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8").replace(/^\uFEFF/, "");
}

/** Collapse all whitespace so line wrapping does not matter. */
function flat(text: string): string {
  return text.replace(/\s+/g, " ");
}

const VARIABLES = [
  "LINK_REPUTATION_API_KEY",
  "LINK_REPUTATION_TIMEOUT_MS",
  "LINK_REPUTATION_CALLS_PER_MINUTE",
  "LINK_REPUTATION_CALLS_PER_DAY",
] as const;

const MODES = [
  "checked",
  "not-requested",
  "not-configured",
  "budget-exhausted",
  "skipped",
  "failed",
] as const;

describe("docs: .env.example (REQ-LREP-64)", () => {
  const text = read(".env.example");
  const lines = text.split(/\r?\n/);

  it.each(VARIABLES)("lists %s with a placeholder and no real key", (name) => {
    const line = lines.find((l) => l.replace(/^#\s*/, "").startsWith(`${name}=`));
    expect(line).toBeDefined();
  });

  it("gives unit, default and bounds for each numeric setting", () => {
    const t = flat(text);
    expect(t).toMatch(/LINK_REPUTATION_TIMEOUT_MS=3000\s+# ms, default 3000, range 500 to 6000/);
    expect(t).toMatch(/LINK_REPUTATION_CALLS_PER_MINUTE=10\s+# default 10, range 0 to 60/);
    expect(t).toMatch(/LINK_REPUTATION_CALLS_PER_DAY=2000\s+# default 2000, range 0 to 10000/);
  });

  it("states the privacy effect", () => {
    const t = flat(text);
    expect(t).toContain("4-byte SHA-256 prefix");
    expect(t).toContain("not the message, not the full link");
    expect(t).toContain("Nothing is stored, cached or logged");
  });

  it("holds a placeholder for the key", () => {
    const line = lines.find((l) => l.includes("LINK_REPUTATION_API_KEY="));
    expect(line).toContain("your-safe-browsing-api-key-here");
  });
});

describe("docs: README.md (REQ-LREP-65)", () => {
  const text = flat(read("README.md"));

  it.each(VARIABLES)("names %s", (name) => {
    expect(text).toContain(`\`${name}\``);
  });

  it.each(MODES)("documents reputationMode value %s", (mode) => {
    expect(text).toContain(`| \`${mode}\` |`);
  });

  it("documents the checkLinks field", () => {
    expect(text).toContain("`checkLinks`");
    expect(text).toContain('"checkLinks": true');
  });

  it("documents the consent rule, data sent and not-listed statement", () => {
    expect(text).toContain("unticked consent box for that one scan");
    expect(text).toContain("never stored and never carried to the next scan");
    expect(text).toContain("first 4 bytes of the SHA-256 hash");
    expect(text).toContain("never sent");
    expect(text).toContain("A link that is not on the list is not called safe");
    expect(text).toContain("Not found on the lists we checked");
    expect(text).toContain("Advisory provided by Google");
  });

  it("keeps the maxDuration sentence and the non-commercial note", () => {
    expect(text).toContain("`maxDuration = 20`");
    expect(text).toContain("non-commercial");
  });
});

describe("docs: steering files (REQ-LREP-66)", () => {
  it("privacy-and-safety.md has the exception, rule 6, table rows and hygiene bullets", () => {
    const t = flat(read(".kiro/steering/privacy-and-safety.md"));
    expect(t).toContain("One narrow exception exists: the optional link lookup of `link-reputation-check`");
    expect(t).toContain("It sends only a 4-byte hash prefix of each link, never the message and never the full link");
    expect(t).toContain("6. **Link reputation lookup (the only exception to forwarding).**");
    expect(t).toContain("all four conditions hold");
    expect(t).toContain("Consent is never stored and never carried to the next scan.");
    expect(t).toContain("Full hashes are compared on our server.");
    expect(t).toContain("`src/server/reputation/reputation-config.ts` and never reaches the browser");
    expect(t).toContain("A link that is not listed is never called safe.");
    expect(t).toContain(
      '| any level, lookup ran, nothing listed | "Not found on the lists we checked" and "New and unreported links are not on any list yet" | "Safe", "Clean", "Verified", "No threats found" |',
    );
    expect(t).toContain(
      '| any level, link listed | "may be on a list of reported sites kept by Google", with "Advisory provided by Google" | "Malicious", "Dangerous", "Fake" as a fact |',
    );
    expect(t).toContain("uses the platform `fetch` and adds no dependency");
    expect(t).toContain("Its only outbound host is `safebrowsing.googleapis.com`.");
    expect(t).toContain("Browser code never calls a reputation service.");
  });

  it("product.md has the done line with the named exception", () => {
    const t = flat(read(".kiro/steering/product.md"));
    expect(t).toContain(
      "except the consented link lookup of `link-reputation-check`, which sends only 4-byte hash prefixes of link expressions",
    );
  });

  it("tech.md lists the four variables", () => {
    const t = read(".kiro/steering/tech.md");
    for (const name of VARIABLES) {
      expect(t).toMatch(new RegExp(`\\| \`${name}\` \\| server only \\|`));
    }
    expect(t).toContain("Default 3000, range 500 to 6000");
    expect(t).toContain("Default 10, range 0 to 60");
    expect(t).toContain("Default 2000, range 0 to 10000");
  });

  it("api-rules.md has the pattern, settings, logging and handler bullets", () => {
    const raw = read(".kiro/steering/api-rules.md");
    expect(raw).toContain('fileMatchPattern: "src/{app/api,server/api,server/reputation}/**"');
    const t = flat(raw);
    expect(t).toContain("link reputation settings (`LINK_REPUTATION_*`) only in src/server/reputation/reputation-config.ts");
    expect(t).toContain("(status, duration, semantic mode, reputation mode)");
    expect(t).toContain("Never log, store, cache or return the URLs, URL expressions, hashes or raw responses of a link reputation lookup.");
    expect(t).toContain("only when the request has `checkLinks: true`");
  });

  it("verdict-rules.md has the two reputation bullets and keeps its front matter", () => {
    const raw = read(".kiro/steering/verdict-rules.md");
    expect(raw.startsWith("---")).toBe(true);
    const t = flat(raw);
    expect(t).toContain("never applies to a result that has a `url.reputation-listed` signal");
    expect(t).toContain("BLOCKING_SIGNAL_IDS");
    expect(t).toContain('"Not listed" is never "safe".');
    expect(t).toContain("The reputation checker is injected like the LLM client.");
    expect(t).toContain("src/pipeline must not import src/server/reputation.");
  });
});
