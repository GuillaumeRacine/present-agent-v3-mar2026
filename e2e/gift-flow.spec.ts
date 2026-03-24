import { test, expect } from "@playwright/test";

// Helper: drive conversation to recommendations
async function driveToRecommendations(page: import("@playwright/test").Page) {
  await page.goto("/gift/new?name=Sarah&occasion=birthday");

  // Wait for first assistant response
  await expect(
    page.locator('[class*="bg-white border border-gray-100 rounded"]').first()
  ).toBeVisible({ timeout: 15_000 });

  // Provide everything Claude needs in one dense message
  const input = page.getByPlaceholder("Type your reply...");
  await expect(input).toBeEnabled({ timeout: 15_000 });
  await input.fill(
    "She loves yoga, design, and coffee. We're close friends. Yoga direction, budget $100. I want to support her practice."
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

    // Check for end states
    const recsButton = page.getByText("Get 3 Recommendations");
    const topPick = page.getByText("Top pick").or(page.getByText("TOP PICK"));

    if (await topPick.count() > 0) return;
    if (await recsButton.count() > 0) {
      await recsButton.scrollIntoViewIfNeeded();
      await recsButton.click();
      await expect(topPick).toBeVisible({ timeout: 30_000 });
      return;
    }

    // If input is available, send a contextful reply
    const inp = page.getByPlaceholder("Type your reply...");
    const inputEnabled = (await inp.isVisible().catch(() => false)) &&
      (await inp.isEnabled().catch(() => false));

    if (inputEnabled) {
      await inp.fill(FALLBACK_REPLIES[Math.min(i, FALLBACK_REPLIES.length - 1)]);
      await page.locator('button[type="submit"]').click();
    }
  }

  // Final check: click recs button if it appeared during last wait
  const recsButton = page.getByText("Get 3 Recommendations");
  if (await recsButton.count() > 0) {
    await recsButton.scrollIntoViewIfNeeded();
    await recsButton.click();
  }

  // Wait for cards to load
  await expect(
    page.getByText("Top pick").or(page.getByText("TOP PICK"))
  ).toBeVisible({ timeout: 30_000 });
}

test.describe("Present Agent — Gift Flow", () => {
  test("home page loads with hero headline and CTA", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("Stop second-guessing every gift");
    await expect(page.getByText("Find a gift in 3 minutes").first()).toBeVisible();
    await expect(page.getByText("Built for ADHD brains")).toBeVisible();
  });

  test("hero CTA links to gift session", async ({ page }) => {
    await page.goto("/");

    const cta = page.getByText("Find a gift in 3 minutes").first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/gift/new");
  });

  test("clicking hero CTA navigates to gift session", async ({ page }) => {
    await page.goto("/");

    await page.getByText("Find a gift in 3 minutes").first().click();

    await page.waitForURL(/\/gift\/new/);
  });

  test("gift session starts conversation automatically", async ({ page }) => {
    await page.goto("/gift/new?name=Sarah&occasion=birthday");

    await expect(page.locator('[class*="bg-black text-white rounded"]').first()).toContainText("Sarah");

    await expect(
      page.locator('[class*="bg-white border border-gray-100 rounded"]').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("suggested reply pills appear after assistant response", async ({ page }) => {
    await page.goto("/gift/new?name=Sarah&occasion=birthday");

    await expect(
      page.locator('[class*="bg-white border border-gray-100 rounded"]').first()
    ).toBeVisible({ timeout: 15_000 });

    const pills = page.locator('button[class*="rounded-full"]');
    await expect(pills.first()).toBeVisible({ timeout: 15_000 });
  });

  test("progress bar shows extract phase initially", async ({ page }) => {
    await page.goto("/gift/new?name=Sarah");

    await expect(page.getByText("Getting to know them")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("full conversation to recommendations", async ({ page }) => {
    test.setTimeout(180_000);

    await driveToRecommendations(page);

    // All 3 recommendation cards present
    await expect(page.getByText(/Choose this for Sarah/).first()).toBeVisible();
    await expect(page.getByText("How to give it").first()).toBeVisible();
    await expect(page.getByText("directly to the product page")).toBeVisible();
  });

  test("recommendation CTA navigates to card page", async ({ page }) => {
    test.setTimeout(180_000);

    await driveToRecommendations(page);

    // Click the CTA — should navigate to card page
    const ctaButton = page.getByText(/Choose this for Sarah/).first();
    await ctaButton.click();

    // Should navigate to the card page
    await page.waitForURL(/\/card/, { timeout: 10_000 });

    // Card page should show loading or card content
    await expect(
      page.getByText("Crafting your card...").or(page.getByText(/Your card for/))
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Present Agent — Card Flow", () => {
  test("card page generates and displays card", async ({ page }) => {
    test.setTimeout(180_000);

    await driveToRecommendations(page);

    // Select product
    const ctaButton = page.getByText(/Choose this for Sarah/).first();
    await ctaButton.click();
    await page.waitForURL(/\/card/, { timeout: 10_000 });

    // Wait for card to generate
    await expect(page.getByText(/Your card for/)).toBeVisible({ timeout: 30_000 });

    // Card preview should be visible
    await expect(page.getByText("Gift card")).toBeVisible();

    // Edit button should exist
    await expect(page.getByText("Edit message")).toBeVisible();

    // Next button should exist
    await expect(page.getByText("Looks good")).toBeVisible();
  });

  test("card flow progresses through all steps", async ({ page }) => {
    test.setTimeout(180_000);

    await driveToRecommendations(page);

    // Select product
    await page.getByText(/Choose this for Sarah/).first().click();
    await page.waitForURL(/\/card/, { timeout: 10_000 });

    // Wait for card
    await expect(page.getByText(/Your card for/)).toBeVisible({ timeout: 30_000 });

    // Step 1 → Step 2 (Presentation)
    await page.getByText("Looks good").click();
    await expect(page.getByText("How to give it")).toBeVisible({ timeout: 5_000 });

    // Step 2 → Step 3 (Summary)
    await page.getByText("Got it").click();
    await expect(page.getByText("Ready to go")).toBeVisible({ timeout: 5_000 });

    // Summary should show buy button
    await expect(page.getByText(/Buy this gift/)).toBeVisible();
    await expect(page.getByText("Copy card message")).toBeVisible();
  });
});

test.describe("Present Agent — Feedback Flow", () => {
  test("invalid feedback token shows expired page", async ({ page }) => {
    await page.goto("/feedback/invalidtoken123");

    await expect(page.getByText("Link expired")).toBeVisible({ timeout: 10_000 });
  });

  test("analytics dashboard loads", async ({ page }) => {
    await page.goto("/admin/analytics");

    await expect(page.getByText("Analytics")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Session Funnel")).toBeVisible();
    await expect(page.getByText("Conversation")).toBeVisible();
    await expect(page.getByText("Recipient Satisfaction")).toBeVisible();
  });
});

test.describe("Present Agent — API Routes", () => {
  test("POST /api/events accepts events", async ({ request }) => {
    const res = await request.post("/api/events", {
      data: { eventType: "session.started", sessionId: "test-123", eventData: { source: "e2e" } },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  test("POST /api/auth/google creates user", async ({ request }) => {
    const res = await request.post("/api/auth/google", {
      data: { googleId: "e2e-test-user", email: "test@e2e.com", name: "E2E User" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.user).toBeDefined();
    expect(json.user.google_id).toBe("e2e-test-user");
  });

  test("GET /api/recipients returns empty for new user", async ({ request }) => {
    const res = await request.get("/api/recipients", {
      headers: { "x-user-id": "nonexistent-user" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.recipients).toEqual([]);
  });

  test("POST /api/sessions creates a session", async ({ request }) => {
    const res = await request.post("/api/sessions", {
      data: { recipientName: "Test Mom" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.sessionId).toBeDefined();
  });

  test("GET /api/analytics returns metrics", async ({ request }) => {
    const res = await request.get("/api/analytics");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.funnel).toBeDefined();
    expect(json.conversation).toBeDefined();
    expect(json.recommendations).toBeDefined();
    expect(json.satisfaction).toBeDefined();
    expect(json.timeToGift).toBeDefined();
  });

  test("POST /api/v1/gift returns recommendations", async ({ request }) => {
    const res = await request.post("/api/v1/gift", {
      data: { recipient: "Mom", occasion: "birthday", budget: "$50-100", interests: "cooking, gardening" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.sessionId).toBeDefined();
    expect(json.recommendations).toHaveLength(3);
    expect(json.recommendations[0].slot).toBe("top_pick");
  });

  test("GET /api/feedback/recipient/:token returns 404 for invalid token", async ({ request }) => {
    const res = await request.get("/api/feedback/recipient/bad-token");
    expect(res.status()).toBe(404);
  });
});
