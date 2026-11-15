import { expect, test } from "@playwright/test";
import type { Page, Request } from "@playwright/test";

/**
 * Home -> bag -> hunt -> reveal, with /api/analyze mocked (no LLM key needed).
 * The mocked body follows the real contract: { verdict, meta: { semanticMode } }.
 */

const SCAM_TEXT = "Your bank account is locked. Click the link and send your code now.";
const CALM_TEXT = "Hi, are we still meeting for lunch on Friday?";

// Internal ids that must never reach the page text.
const FORBIDDEN_IDS = [
  "text.urgency",
  "text.otp-request",
  "url.brand-lookalike",
  "payment-qr",
  "no_signals",
  "job-bait",
];

const SCAM_VERDICT = {
  riskScore: 82,
  level: "critical",
  monster: "bank",
  signals: [
    {
      id: "text.otp-request",
      source: "text",
      severity: 0.9,
      evidence: "send your code now",
      whyItMatters: "Asks for a code.",
    },
    {
      id: "text.urgency",
      source: "text",
      severity: 0.6,
      evidence: "account is locked",
      whyItMatters: "Tries to rush you.",
    },
  ],
  actions: ["Do not click the link.", "Call your bank on a number you look up yourself."],
  limitations: [],
  semantic: { status: "ok", skipped: false },
  inputTruncated: false,
  urlsAnalyzed: 0,
  urlsSkipped: 0,
};

const CALM_VERDICT = {
  riskScore: 0,
  level: "no_signals",
  monster: null,
  signals: [],
  actions: ["If a message asks for money, call the official number yourself."],
  limitations: [],
  semantic: { status: "ok", skipped: false },
  inputTruncated: false,
  urlsAnalyzed: 0,
  urlsSkipped: 0,
};

async function mockAnalyze(page: Page, verdict: unknown): Promise<void> {
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ verdict, meta: { semanticMode: "used" } }),
    });
  });
}

function recordRequests(page: Page): Request[] {
  const seen: Request[] = [];
  page.on("request", (request) => seen.push(request));
  return seen;
}

async function expectNoPageScroll(page: Page): Promise<void> {
  const m = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  expect(m.scrollHeight).toBeLessThanOrEqual(m.innerHeight);
}

async function expectNoIds(page: Page): Promise<void> {
  const visible = await page.evaluate(() => document.body.innerText);
  // Collapsed "Technical details" are not in innerText, so read them directly.
  const details = await page.evaluate(() =>
    Array.from(document.querySelectorAll("details")).map((d) => d.textContent ?? ""),
  );
  const all = [visible, ...details].join("\n");
  for (const id of FORBIDDEN_IDS) expect(all, `page text contains "${id}"`).not.toContain(id);
}

function expectNetworkClean(requests: Request[], baseURL: string): void {
  const origin = new URL(baseURL).origin;
  const external = requests
    .map((r) => r.url())
    .filter((u) => !u.startsWith("data:") && !u.startsWith("blob:") && new URL(u).origin !== origin);
  expect(external, "third-party requests").toEqual([]);

  // Anything that carries content (a body) must be the one POST to /api/analyze.
  const withBody = requests.filter((r) => r.postData() !== null || r.method() !== "GET");
  expect(withBody.map((r) => `${r.method()} ${new URL(r.url()).pathname}`)).toEqual([
    "POST /api/analyze",
  ]);
}

async function runFlow(page: Page, text: string): Promise<void> {
  await page.goto("/");
  await expectNoPageScroll(page);

  await page.getByRole("button", { name: "Open the hunter's bag" }).click();
  await expect(page.getByRole("heading", { name: "The hunter's bag" })).toBeVisible();
  await expectNoPageScroll(page);

  await page.getByLabel("Paste the message or link you want to check").fill(text);
  await page.getByRole("button", { name: "Start the hunt" }).click();

  // The mock answers at once, so a text-only hunt shows its last Leg (the ruins).
  await expect(page.locator("[data-leg]")).toBeVisible();
  await expectNoPageScroll(page);

  await expect(page.getByRole("region", { name: "Hunt report" })).toBeVisible();
  await expectNoPageScroll(page);
  await expectNoIds(page);
}

test.describe("hunt flow", () => {
  test("bank scam message reveals a monster with evidence", async ({ page, baseURL }) => {
    const requests = recordRequests(page);
    await mockAnalyze(page, SCAM_VERDICT);
    await runFlow(page, SCAM_TEXT);

    await expect(page.getByText("Strong indicators of a scam").first()).toBeVisible();
    await expect(page.getByText("Bank Ghost").first()).toBeVisible();
    await expect(page.getByText("send your code now").first()).toBeVisible();

    expectNetworkClean(requests, baseURL ?? "");
    const post = requests.find((r) => r.method() === "POST");
    expect(post?.postDataJSON()).toMatchObject({ text: SCAM_TEXT });
  });

  test("harmless message reads as no warning signs found", async ({ page, baseURL }) => {
    const requests = recordRequests(page);
    await mockAnalyze(page, CALM_VERDICT);
    await runFlow(page, CALM_TEXT);

    await expect(page.getByText("No warning signs found.").first()).toBeVisible();
    await expect(page.getByText("Nothing detected yet").first()).toBeVisible();

    expectNetworkClean(requests, baseURL ?? "");
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("flow works and skips the hunt wait", async ({ page, baseURL }) => {
    const requests = recordRequests(page);
    await mockAnalyze(page, SCAM_VERDICT);
    await page.goto("/");
    await page.getByRole("button", { name: "Open the hunter's bag" }).click();
    await page.getByLabel("Paste the message or link you want to check").fill(SCAM_TEXT);
    const started = Date.now();
    await page.getByRole("button", { name: "Start the hunt" }).click();
    await expect(page.getByRole("region", { name: "Hunt report" })).toBeVisible();
    // Normal runs wait at least 4 s (MIN_HUNT_MS); reduced motion must not.
    expect(Date.now() - started).toBeLessThan(3500);
    await expectNoPageScroll(page);
    await expectNoIds(page);
    expectNetworkClean(requests, baseURL ?? "");
  });
});
