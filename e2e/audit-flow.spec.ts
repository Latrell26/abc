import { test, expect } from "@playwright/test";

const MOCK_AUDIT_RESPONSE = {
  success: true,
  domain: "https://example.com",
  totalPages: 1,
  pageResults: [{
    url: "https://example.com",
    status: "success",
    pageSpeedScore: 85,
    overallScore: 80,
    psiMetrics: [
      { id: "fcp", label: "First Contentful Paint", value: "1.2s", score: 90 },
      { id: "lcp", label: "Largest Contentful Paint", value: "2.1s", score: 80 },
      { id: "tbt", label: "Total Blocking Time", value: "150ms", score: 75 },
      { id: "cls", label: "Cumulative Layout Shift", value: "0.05", score: 90 },
    ],
    checks: {
      titleTag: { status: "pass", verdict: "Title tag found: Example" },
      metaDescription: { status: "fail", verdict: "No meta description found." },
      headingStructure: { status: "pass", verdict: "Heading hierarchy is logical.", h1Count: 1 },
      altText: { status: "pass", verdict: "All images have alt text." },
      canonicalTag: { status: "pass", verdict: "Canonical tag found: https://example.com" },
    },
  }],
  overallScore: 80,
  aggregateChecks: { total: 5, passed: 4, failed: 1, partial: 0 },
  diagnostics: {
    discovery: "manual",
    discoveredCount: 1,
    auditedCount: 1,
    failedCount: 0,
    durationMs: 1000,
  },
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/audit", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_AUDIT_RESPONSE),
    });
  });
});

test("primary audit flow: home -> loading -> results", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/SEO Audit/);

  await page.fill('[placeholder="https://example.com"]', "https://example.com");
  await page.click('button:has-text("Run audit")');

  await expect(page).toHaveURL(/\/audit\/loading/);
  await expect(page.getByRole("heading", { name: /Analyzing your website/i })).toBeVisible();

  await expect(page.getByRole("heading", { name: /Your SEO report/i })).toBeVisible({ timeout: 120000 });

  await expect(page.getByText(/Overall SEO/i)).toBeVisible();
  await expect(page.getByText(/Technical checks/i)).toBeVisible();
  await expect(page.getByText(/Page speed/i)).toBeVisible();
});

test("shows error for empty URL submission", async ({ page }) => {
  await page.goto("/");
  await page.click('button:has-text("Run audit")');
  await expect(page.locator("#url-error")).toContainText("Please enter a website URL");
});

test("shows error for invalid URL format", async ({ page }) => {
  await page.goto("/");
  await page.fill('[placeholder="https://example.com"]', "not-a-url");
  await page.click('button:has-text("Run audit")');
  await expect(page.locator("#url-error")).toContainText("doesn't look like a valid URL");
});