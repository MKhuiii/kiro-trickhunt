// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Covers REQ-LREP-01, REQ-LREP-02, REQ-LREP-58. Scans App.tsx as text.
const APP = readFileSync(join(process.cwd(), "src", "components", "App.tsx"), "utf8");

function body(start: string): string {
  const from = APP.indexOf(start);
  expect(from).toBeGreaterThan(-1);
  const next = APP.indexOf("\n  };\n", from);
  return APP.slice(from, next);
}

describe("App link-check consent flag", () => {
  it("is memory-only state that starts unticked", () => {
    expect(APP).toContain("const [checkLinks, setCheckLinks] = useState(false);");
  });

  it("is passed to BagPanel", () => {
    expect(APP).toContain("checkLinks={checkLinks}");
    expect(APP).toContain("onCheckLinksChange={setCheckLinks}");
  });

  it("submit captures the flag, clears it at once and passes the captured value to runCheck", () => {
    const submit = body("const submit = ");
    const capture = submit.indexOf("const scanCheckLinks = checkLinks;");
    const clear = submit.indexOf("setCheckLinks(false);");
    const run = submit.indexOf("runCheck(");
    expect(capture).toBeGreaterThan(-1);
    expect(clear).toBeGreaterThan(capture);
    expect(run).toBeGreaterThan(clear);
    expect(submit).toContain("checkLinks: scanCheckLinks");
  });

  it("reset clears the flag", () => {
    expect(body("const reset = ")).toContain("setCheckLinks(false);");
  });

  it("never writes the flag to storage", () => {
    const uses = APP.split("\n").filter((l) => /checkLinks/i.test(l));
    for (const line of uses) expect(line).not.toMatch(/savePreference|localStorage|sessionStorage/);
  });
});
