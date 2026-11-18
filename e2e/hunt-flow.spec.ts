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
  reputation: { status: "not-requested", checkedCount: 0 },
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
  reputation: { status: "not-requested", checkedCount: 0 },
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

  await expect(page.getByRole("article", { name: "The hunter's journal" })).toBeVisible();
  // The paper must have a real width at every size (it once shrank to nothing on tablets).
  const paper = await page.getByRole("article", { name: "The hunter's journal" }).boundingBox();
  expect(paper?.width ?? 0).toBeGreaterThan(200);
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

test.describe("journal and settings", () => {
  test("turns to the full notes and back, with no page scroll", async ({ page }) => {
    await mockAnalyze(page, SCAM_VERDICT);
    await runFlow(page, SCAM_TEXT);

    await page.getByRole("button", { name: "Read the full notes" }).click();
    await expect(page.getByRole("region", { name: "Full notes" })).toBeVisible();
    await expect(page.getByText("What to do now")).toBeVisible();
    await expectNoPageScroll(page);
    await expectNoIds(page);

    await page.getByRole("button", { name: "Back to the note" }).click();
    await expect(page.getByRole("region", { name: "The hunter's note" })).toBeVisible();
    await page.getByRole("button", { name: "Hunt again" }).click();
    await expect(page.getByRole("button", { name: "Open the hunter's bag" })).toBeVisible();
  });

  test("the logo sits above the hunter and there is no header bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "TrickHunt" })).toBeVisible();
    await expect(page.locator("header")).toHaveCount(0);
    const logo = await page.getByRole("heading", { level: 1 }).boundingBox();
    const hunter = await page.getByRole("button", { name: "Open the hunter's bag" }).boundingBox();
    expect(logo && hunter && logo.y + logo.height <= hunter.y + 1).toBe(true);
    await expectNoPageScroll(page);
  });

  test("ambient sound is off by default and the speaker button switches it on", async ({
    page,
  }) => {
    await page.goto("/");
    const sound = page.getByRole("button", { name: "Spooky sound" });
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "true");
    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "false");
  });

  test("the flag button switches the language both ways", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Language: English/ }).click();
    await expect(page.getByText("Chạm vào bác thợ săn để mở túi của ông.")).toBeVisible();
    await page.getByRole("button", { name: /^Ngôn ngữ: Tiếng Việt/ }).click();
    await expect(page.getByText("Tap the hunter to open his bag.")).toBeVisible();
  });

  test("the gear button opens and closes the settings panel", async ({ page }) => {
    await page.goto("/");
    const gear = page.getByRole("button", { name: "Settings" });
    await gear.click();
    await expect(page.getByLabel("Text size")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Text size")).toHaveCount(0);
    await expect(gear).toBeFocused();
  });
});

test.describe("halloween voice", () => {
  test("the home screen and the hunt speak in the horror voice", async ({ page }) => {
    // A slow answer keeps the hunt (and its status line) on screen.
    await page.route("**/api/analyze", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 8000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ verdict: SCAM_VERDICT, meta: { semanticMode: "used" } }),
      });
    });
    await page.goto("/");
    await expect(
      page.getByText("Before you reply, send the hunter into the dark after that strange message."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Open the hunter's bag" }).click();
    await page.getByLabel("Paste the message or link you want to check").fill(SCAM_TEXT);
    await page.getByRole("button", { name: "Start the hunt" }).click();
    await expect(page.getByText("Following the trail of warning signs…").first()).toBeVisible();
  });

  test("the fixed text stays plain on a result, with no banned word", async ({ page }) => {
    await mockAnalyze(page, SCAM_VERDICT);
    await runFlow(page, SCAM_TEXT);
    await expect(page.getByText("Strong indicators of a scam").first()).toBeVisible();
    await expect(page.getByText("Do this first")).toBeVisible();
    await expect(
      page.getByText("TrickHunt looks for warning signs. It cannot prove that a message is genuine."),
    ).toBeVisible();
    // The full notes use the horror voice for the monster section and keep the plain text elsewhere.
    await page.getByRole("button", { name: "Read the full notes" }).click();
    await expect(page.getByText("The monster behind this trick")).toBeVisible();
    await expect(page.getByText("How to spot this monster")).toBeVisible();
    await expect(page.getByText("What to do now")).toBeVisible();
    const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    expect(text).not.toMatch(/\b(safe|clean|definitely|guaranteed)\b/);
  });
});

test.describe("canvas actors", () => {
  test("the hunter and the shade are painted in the canvas while hunting", async ({ page }) => {
    // A slow answer keeps the hunt on screen long enough to look at it.
    await page.route("**/api/analyze", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 12000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ verdict: SCAM_VERDICT, meta: { semanticMode: "used" } }),
      });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Open the hunter's bag" }).click();
    await page.getByLabel("Paste the message or link you want to check").fill(SCAM_TEXT);
    await page.getByRole("button", { name: "Start the hunt" }).click();
    await expect(page.locator("[data-leg]")).toBeVisible();
    await expect(page.locator("[data-stage] canvas")).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('[data-actor="hunter"][data-canvas-actor="on"]')).toHaveCount(1);
    await expect(page.locator('[data-actor="shade"][data-canvas-actor="on"]')).toHaveCount(1);
    // The SVG copy stays for layout, but is see-through.
    const opacity = await page
      .locator('[data-actor="hunter"] svg')
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe("0");
  });

  test("the monster is painted in the canvas after the reveal, and the SVG returns for a new hunt", async ({
    page,
  }) => {
    await mockAnalyze(page, SCAM_VERDICT);
    await runFlow(page, SCAM_TEXT);
    await page.waitForTimeout(1500);
    test.skip((await page.locator("[data-stage] canvas").count()) === 0, "no WebGL: the SVG stays");
    await expect(page.locator('[data-actor="monster"][data-canvas-actor="on"]')).toHaveCount(1);
    const opacity = await page
      .locator('[data-actor="monster"] svg')
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe("0");

    await page.getByRole("button", { name: "Hunt again" }).click();
    await expect(page.locator("[data-canvas-actor]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open the hunter's bag" })).toBeVisible();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("flow works and skips the hunt wait", async ({ page, baseURL }) => {
    const requests = recordRequests(page);
    // Time from the moment the answer is sent to the moment the journal shows. A normal run
    // still waits for the rest of the 4 s minimum hunt time; reduced motion must not. Measuring
    // from the answer (not from the click) keeps this check independent of how busy the machine is.
    let answeredAt = 0;
    await page.route("**/api/analyze", async (route) => {
      answeredAt = Date.now();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ verdict: SCAM_VERDICT, meta: { semanticMode: "used" } }),
      });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Open the hunter's bag" }).click();
    await page.getByLabel("Paste the message or link you want to check").fill(SCAM_TEXT);
    await page.getByRole("button", { name: "Start the hunt" }).click();
    await expect(page.getByRole("article", { name: "The hunter's journal" })).toBeVisible();
    expect(answeredAt).toBeGreaterThan(0);
    expect(Date.now() - answeredAt).toBeLessThan(2500);
    await expectNoPageScroll(page);
    await expectNoIds(page);
    expectNetworkClean(requests, baseURL ?? "");
  });
});
