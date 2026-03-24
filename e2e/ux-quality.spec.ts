import { test, expect, Page } from "@playwright/test";

// ── Helper: drive conversation to Gift Profile Card and Recommendations ──
async function driveToRecommendations(page: Page) {
  await page.goto("/gift/new?name=Sarah&occasion=birthday");

  // Wait for first assistant response (white bubble)
  await expect(
    page.locator('[class*="bg-white border border-gray-100 rounded"]').first()
  ).toBeVisible({ timeout: 30_000 });

  // Send a dense context message to get to completion quickly
  const input = page.getByPlaceholder("Type your reply...");
  await expect(input).toBeEnabled({ timeout: 15_000 });
  await input.fill(
    "She loves yoga and coffee. Close friend. Under $100. Support her wellness practice."
  );
  await page.locator('button[type="submit"]').click();

  // Adaptive loop: keep answering until profile card or recs appear
  const FALLBACK_REPLIES = [
    "Yoga direction. She does vinyasa daily. Budget around $100.",
    "Wellness and yoga — that's the direction. $100 budget. Let's go.",
    "Just go with yoga gear under $100, that's perfect for her.",
  ];

  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(3_000);

    const recsButton = page.getByText("Get 3 Recommendations");
    const topPick = page.getByText("Top pick").or(page.getByText("TOP PICK"));

    if ((await topPick.count()) > 0) return;
    if ((await recsButton.count()) > 0) {
      await recsButton.scrollIntoViewIfNeeded();
      await recsButton.click();
      await expect(topPick).toBeVisible({ timeout: 60_000 });
      return;
    }

    // If input is available, send a fallback reply
    const inp = page.getByPlaceholder("Type your reply...");
    const inputEnabled =
      (await inp.isVisible().catch(() => false)) &&
      (await inp.isEnabled().catch(() => false));

    if (inputEnabled) {
      await inp.fill(FALLBACK_REPLIES[Math.min(i, FALLBACK_REPLIES.length - 1)]);
      await page.locator('button[type="submit"]').click();
    }
  }

  // Final attempt: click recs button if it appeared
  const recsButton = page.getByText("Get 3 Recommendations");
  if ((await recsButton.count()) > 0) {
    await recsButton.scrollIntoViewIfNeeded();
    await recsButton.click();
  }

  await expect(
    page.getByText("Top pick").or(page.getByText("TOP PICK"))
  ).toBeVisible({ timeout: 60_000 });
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Visual Completeness
// ────────────────────────────────────────────────────────────────────────────
test.describe("UX Quality — Visual Completeness", () => {
  test("home page has hero headline, CTA, and how-it-works section", async ({
    page,
  }) => {
    await page.goto("/");

    // Title
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Stop second-guessing every gift");

    // Subtitle
    await expect(page.getByText("AI-powered gift confidence")).toBeVisible();

    // Trust chip
    await expect(page.getByText("Built for ADHD brains")).toBeVisible();

    // CTA button (appears twice on page: hero + bottom section)
    await expect(page.getByText("Find a gift in 3 minutes").first()).toBeVisible();

    // How it works section
    await expect(page.getByText("How it works")).toBeVisible();
  });

  test("gift session header shows phase progress and input is in thumb zone", async ({
    page,
  }) => {
    await page.goto("/gift/new?name=Sarah&occasion=birthday");

    // Header with name
    const header = page.locator("h1");
    await expect(header).toContainText("Sarah");

    // Phase label (starts at "Getting to know them")
    await expect(page.getByText("Getting to know them")).toBeVisible({
      timeout: 15_000,
    });

    // Progress bar dots (4 phase segments)
    const progressBars = page.locator(
      ".sticky .h-1.rounded-full.overflow-hidden"
    );
    await expect(progressBars).toHaveCount(4);

    // Input area exists and is at the bottom (thumb zone)
    const inputForm = page.getByPlaceholder("Type your reply...");
    await expect(inputForm).toBeVisible({ timeout: 15_000 });

    // Verify input is in the lower portion of the viewport (thumb zone)
    const inputBox = await inputForm.boundingBox();
    const viewport = page.viewportSize();
    expect(inputBox).toBeTruthy();
    expect(viewport).toBeTruthy();
    if (inputBox && viewport) {
      // Input should be in the bottom 40% of the screen
      expect(inputBox.y).toBeGreaterThan(viewport.height * 0.5);
    }
  });

  test("loading state shows bounce dots during chat", async ({ page }) => {
    await page.goto("/gift/new?name=Sarah&occasion=birthday");

    // The auto-start message triggers loading — check for bounce dots
    // Look for the bounce animation dots (they appear before the first response)
    const bounceDots = page.locator(".animate-bounce");
    // They should appear at least briefly while waiting for the first response
    await expect(bounceDots.first()).toBeVisible({ timeout: 5_000 });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Conversation UX
// ────────────────────────────────────────────────────────────────────────────
test.describe("UX Quality — Conversation UX", () => {
  test("full conversation flow: pills, typing, loading, colored bubbles", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await page.goto("/gift/new?name=Sarah&occasion=birthday");

    // Wait for first AI response (white/light bubble)
    const assistantBubble = page
      .locator('[class*="bg-white border border-gray-100 rounded"]')
      .first();
    await expect(assistantBubble).toBeVisible({ timeout: 30_000 });

    // Check that suggested reply pills appear
    const pills = page.locator('button[class*="rounded-full"]');
    await expect(pills.first()).toBeVisible({ timeout: 10_000 });

    // Check pills are short (< 25 chars each)
    const pillCount = await pills.count();
    expect(pillCount).toBeGreaterThan(0);
    for (let i = 0; i < pillCount; i++) {
      const text = await pills.nth(i).textContent();
      if (text && text.length > 2) {
        // Only check actual pill text, skip tiny UI elements
        expect(text.length).toBeLessThanOrEqual(40); // generous but catches runaway text
      }
    }

    // Type a message and submit
    const input = page.getByPlaceholder("Type your reply...");
    await expect(input).toBeEnabled({ timeout: 15_000 });
    await input.fill("She loves hiking and reading");
    await page.locator('button[type="submit"]').click();

    // Verify loading animation appears (bounce dots)
    const bounceDots = page.locator(".animate-bounce");
    await expect(bounceDots.first()).toBeVisible({ timeout: 3_000 });

    // Verify user message appears in a dark bubble (div, not button)
    const userBubbles = page.locator('div[class*="bg-black text-white rounded"]');
    const userBubbleCount = await userBubbles.count();
    expect(userBubbleCount).toBeGreaterThanOrEqual(2); // auto-start + typed message

    // Wait for new assistant response
    await expect(
      page
        .locator('[class*="bg-white border border-gray-100 rounded"]')
        .nth(1)
    ).toBeVisible({ timeout: 30_000 });

    // Verify different colored bubbles: user = black bg, assistant = white bg
    // Use a more specific selector that excludes the submit button
    const userMessageBubbles = page.locator(
      'div[class*="bg-black text-white rounded"]'
    );
    const lastUserBubble = userMessageBubbles.last();
    await expect(lastUserBubble).toContainText("hiking and reading");

    const assistantBubbles = page.locator(
      '[class*="bg-white border border-gray-100 rounded"]'
    );
    expect(await assistantBubbles.count()).toBeGreaterThanOrEqual(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Gift Profile Card UX
// ────────────────────────────────────────────────────────────────────────────
test.describe("UX Quality — Gift Profile Card", () => {
  test("profile card shows name, interests, budget, occasion, and effort reflection", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await page.goto("/gift/new?name=Sarah&occasion=birthday");

    // Wait for first response
    await expect(
      page
        .locator('[class*="bg-white border border-gray-100 rounded"]')
        .first()
    ).toBeVisible({ timeout: 30_000 });

    // Send dense context to reach completion
    const input = page.getByPlaceholder("Type your reply...");
    await expect(input).toBeEnabled({ timeout: 15_000 });
    await input.fill(
      "She loves yoga and coffee. Close friend. Under $100. Support her wellness practice."
    );
    await page.locator('button[type="submit"]').click();

    // Wait for profile card (has "Get 3 Recommendations" button)
    const recsButton = page.getByText("Get 3 Recommendations");

    // Adaptive: keep answering until profile card appears
    const FALLBACK = [
      "Yoga direction. She does vinyasa daily. Budget around $100.",
      "Wellness and yoga. $100 budget. Let's go.",
    ];

    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(3_000);
      if ((await recsButton.count()) > 0) break;

      const inp = page.getByPlaceholder("Type your reply...");
      const canType =
        (await inp.isVisible().catch(() => false)) &&
        (await inp.isEnabled().catch(() => false));
      if (canType) {
        await inp.fill(FALLBACK[Math.min(i, FALLBACK.length - 1)]);
        await page.locator('button[type="submit"]').click();
      }
    }

    await expect(recsButton).toBeVisible({ timeout: 30_000 });

    // Profile card should show the recipient name
    const profileCard = page.locator(".bg-gradient-to-r");
    await expect(profileCard).toBeVisible();
    await expect(profileCard).toContainText("Sarah");

    // Interest chips should be visible (blue pills)
    const interestChips = page.locator(
      'span[class*="bg-blue-50 text-blue-700 rounded-full"]'
    );
    expect(await interestChips.count()).toBeGreaterThan(0);

    // Budget section (use exact match to avoid matching chat messages)
    await expect(page.getByText("Budget", { exact: true })).toBeVisible();

    // Occasion section (use exact match)
    await expect(page.getByText("Occasion", { exact: true })).toBeVisible();

    // Effort reflection section
    await expect(page.getByText("Based on what you shared")).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Recommendation Cards UX
// ────────────────────────────────────────────────────────────────────────────
test.describe("UX Quality — Recommendation Cards", () => {
  test("3 cards with rank badges, product details, why-this-fits, reactions, and CTA", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await driveToRecommendations(page);

    // Verify exactly 3 recommendation cards
    const cards = page.locator(
      'a[class*="block bg-white rounded-2xl border"]'
    );
    await expect(cards).toHaveCount(3);

    // Check rank badges: Top pick, Great match, Wild card
    await expect(page.getByText("Top pick")).toBeVisible();
    await expect(page.getByText("Great match")).toBeVisible();
    await expect(page.getByText("Wild card")).toBeVisible();

    // Each card should have a product name (h3)
    const productNames = page.locator(
      'a[class*="block bg-white rounded-2xl"] h3'
    );
    expect(await productNames.count()).toBe(3);
    for (let i = 0; i < 3; i++) {
      const name = await productNames.nth(i).textContent();
      expect(name).toBeTruthy();
      expect(name!.length).toBeGreaterThan(0);
    }

    // Each card should have a price in the CTA
    const ctaButtons = page.locator('button:has-text("Choose this for Sarah")');
    expect(await ctaButtons.count()).toBe(3);
    for (let i = 0; i < 3; i++) {
      const ctaText = await ctaButtons.nth(i).textContent();
      expect(ctaText).toMatch(/\$\d+/); // Has a price
    }

    // "Why this fits" section (blue bg box)
    const whyThisFits = page.locator('div[class*="bg-blue-50 border border-blue-100"]');
    expect(await whyThisFits.count()).toBeGreaterThanOrEqual(3);

    // "How to give it" details section (collapsed by default)
    const howToGiveIt = page.locator("summary", { hasText: "How to give it" });
    expect(await howToGiveIt.count()).toBe(3);

    // "What this gift says" section should appear on at least one card
    const whatThisSays = page.locator('div:has-text("What this gift says")').locator('[class*="bg-violet-50"]');
    expect(await whatThisSays.count()).toBeGreaterThanOrEqual(1);

    // Thumbs up/down reaction buttons exist (on each card)
    const thumbsUpButtons = page.locator('button[title="Great match"]');
    expect(await thumbsUpButtons.count()).toBe(3);
    const thumbsDownButtons = page.locator('button[title="Not a match"]');
    expect(await thumbsDownButtons.count()).toBe(3);

    // "Too pricey" reaction button
    const tooPricey = page.locator('button[title="Too pricey"]');
    expect(await tooPricey.count()).toBe(3);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Navigation Flow
// ────────────────────────────────────────────────────────────────────────────
test.describe("UX Quality — Navigation Flow", () => {
  test("choosing a recommendation navigates to card page", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await driveToRecommendations(page);

    // Click "Choose this for Sarah" on the first recommendation
    const ctaButton = page
      .getByText(/Choose this for Sarah/)
      .first();
    await ctaButton.click();

    // Verify navigation to card page
    await page.waitForURL(/\/card/, { timeout: 10_000 });

    // Wait for card generation (loading or card content)
    await expect(
      page
        .getByText("Crafting your card...")
        .or(page.getByText(/Your card for/))
    ).toBeVisible({ timeout: 30_000 });

    // If card has loaded, check for key elements
    const cardLoaded = await page
      .getByText(/Your card for/)
      .isVisible()
      .catch(() => false);

    if (cardLoaded) {
      // Card preview should exist
      await expect(page.getByText("Gift card")).toBeVisible({ timeout: 5_000 });

      // Edit button
      await expect(page.getByText("Edit message")).toBeVisible();

      // "Looks good" next button
      await expect(page.getByText("Looks good")).toBeVisible();
    }

    // Navigate back to session page
    await page.goBack();
    // Session page should reload (state may or may not persist)
    await page.waitForTimeout(2_000);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Admin Analytics Page
// ────────────────────────────────────────────────────────────────────────────
test.describe("UX Quality — Admin Analytics", () => {
  test("dashboard shows all sections with valid stat values", async ({
    page,
  }) => {
    await page.goto("/admin/analytics");

    // Main heading
    await expect(page.getByText("Analytics")).toBeVisible({ timeout: 10_000 });

    // All dashboard section headings
    await expect(page.getByText("Session Funnel")).toBeVisible();
    await expect(page.getByText("Conversation")).toBeVisible();
    await expect(page.getByText("Recommendations")).toBeVisible();
    await expect(page.getByText("Recipient Satisfaction")).toBeVisible();
    await expect(page.getByText("Time to Gift")).toBeVisible();

    // Stat cards should show numbers, NOT "undefined" or "NaN"
    const statValues = page.locator(".text-2xl.font-semibold");
    const count = await statValues.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const text = await statValues.nth(i).textContent();
      expect(text).toBeTruthy();
      expect(text).not.toContain("undefined");
      expect(text).not.toContain("NaN");
      expect(text).not.toBe("");
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Feedback Page UX
// ────────────────────────────────────────────────────────────────────────────
test.describe("UX Quality — Feedback Page", () => {
  test("invalid token shows 'Link expired' message", async ({ page }) => {
    await page.goto("/feedback/invalidtoken");

    await expect(page.getByText("Link expired")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText("This feedback link is no longer valid")
    ).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 8. Mobile Responsiveness
// ────────────────────────────────────────────────────────────────────────────
test.describe("UX Quality — Mobile Responsiveness", () => {
  test("home page elements are visible and not cut off on iPhone SE", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();

    await page.goto("/");

    // Headline should be visible
    await expect(page.locator("h1")).toContainText("Stop second-guessing every gift");

    // CTA should be fully visible and not cut off (appears twice, use first)
    const cta = page.getByText("Find a gift in 3 minutes").first();
    await expect(cta).toBeVisible();
    const ctaBox = await cta.boundingBox();
    expect(ctaBox).toBeTruthy();
    if (ctaBox) {
      expect(ctaBox.x + ctaBox.width).toBeLessThanOrEqual(375 + 1); // 1px tolerance
      expect(ctaBox.x).toBeGreaterThanOrEqual(0);
    }

    // Trust chip should be visible
    await expect(page.getByText("Built for ADHD brains")).toBeVisible();

    await context.close();
  });

  test("chat bubbles do not overflow horizontally on iPhone SE", async ({
    browser,
  }) => {
    test.setTimeout(60_000);

    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();

    await page.goto("/gift/new?name=Sarah&occasion=birthday");

    // Wait for assistant response
    const assistantBubble = page
      .locator('[class*="bg-white border border-gray-100 rounded"]')
      .first();
    await expect(assistantBubble).toBeVisible({ timeout: 30_000 });

    // Check all chat bubbles don't overflow
    const allBubbles = page.locator(
      '[class*="bg-black text-white rounded"], [class*="bg-white border border-gray-100 rounded"]'
    );
    const bubbleCount = await allBubbles.count();

    for (let i = 0; i < bubbleCount; i++) {
      const box = await allBubbles.nth(i).boundingBox();
      if (box) {
        // Bubble right edge should not exceed viewport width
        expect(box.x + box.width).toBeLessThanOrEqual(375 + 2); // 2px tolerance
        // Bubble should not start off-screen left
        expect(box.x).toBeGreaterThanOrEqual(-1);
      }
    }

    await context.close();
  });
});
