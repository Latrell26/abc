import { test, expect } from "@playwright/test";

test("primary audit flow: home -> loading -> results", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/SEO Audit/);

  await page.fill('[placeholder="https://example.com"]', "https://example.com");
  await page.click('button:has-text("Run audit")');

  await expect(page).toHaveURL(/\/audit\/loading/);
  await expect(page.getByText(/Analyzing your website/i)).toBeVisible();

  await expect(page.getByText(/Your SEO report/i)).toBeVisible({ timeout: 120000 });

  await expect(page.getByRole("heading", { name: /Your SEO report/i })).toBeVisible();
  await expect(page.getByText(/Overall SEO/i)).toBeVisible();
  await expect(page.getByText(/Technical checks/i)).toBeVisible();
  await expect(page.getByText(/Page speed/i)).toBeVisible();
});

test("shows error for empty URL submission", async ({ page }) => {
  await page.goto("/");
  await page.click('button:has-text("Run audit")');
  await expect(page.getByRole("alert")).toHaveTextContent(/Please enter a website URL/i);
});

test("shows error for invalid URL format", async ({ page }) => {
  await page.goto("/");
  await page.fill('[placeholder="https://example.com"]', "not-a-url");
  await page.click('button:has-text("Run audit")');
  await expect(page.getByRole("alert")).toHaveTextContent(/doesn't look like a valid URL/i);
});

test("AI summary and comparePages tool", async ({ page }) => {
  await page.goto("/");

  await page.fill('[placeholder="https://example.com"]', "https://example.com");
  await page.click('button:has-text("Run audit")');

  await expect(page).toHaveURL(/\/audit\/loading/);
  await expect(page.getByText(/Analyzing your website/i)).toBeVisible();

  await expect(page.getByText(/Your SEO report/i)).toBeVisible({ timeout: 120000 });

  await page.click("text=AI Summary");
  await expect(page).toHaveURL("/results/ai-summary");

  await expect(page.getByRole("log")).toBeVisible();
  await expect(page.getByText(/Ask about your audit/i)).toBeVisible();

  await page.fill('[placeholder="Ask a question about your audit"]', "Which page has the worst heading structure?");
  await page.click('button:has-text("Send message")');

  await expect(page.getByRole("status", { name: /Checking pages/i })).toBeVisible({ timeout: 15000 });

  await expect(page.getByText(/Best:/i)).toBeVisible();
  await expect(page.getByText(/Worst:/i)).toBeVisible();
});