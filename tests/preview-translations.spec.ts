import { expect, test } from "@playwright/test";

// /preview renders the walkthrough directly, so these run against the dev
// server without flipping NEXT_PUBLIC_APP_MODE.
const PREVIEW_URL = "/preview";

const russianOnlyText = /Почему здесь нельзя войти/;
const englishOnlyText = /Why you cannot sign in here/;

test.describe("Preview page translations", () => {
  test("renders in English for an English browser", async ({ page }) => {
    await page.goto(PREVIEW_URL);

    await expect(page.getByText(englishOnlyText)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Screenshots" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "English" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  test("switches to Russian and remembers the choice", async ({ page }) => {
    await page.goto(PREVIEW_URL);
    await page.getByRole("radio", { name: "Русский" }).click();

    await expect(page.getByText(russianOnlyText)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Скриншоты" })).toBeVisible();
    // The whole page is Russian, including the screenshot captions.
    await expect(page.getByText(englishOnlyText)).toHaveCount(0);
    await expect(page.getByText("Или задайте фильтры сами")).toBeVisible();

    // The choice is stored, so a reload comes back in Russian.
    await page.reload();
    await expect(page.getByText(russianOnlyText)).toBeVisible();
    await expect(page.getByRole("radio", { name: "Русский" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  test("switches back to English", async ({ page }) => {
    await page.goto(PREVIEW_URL);
    await page.getByRole("radio", { name: "Русский" }).click();
    await expect(page.getByText(russianOnlyText)).toBeVisible();

    await page.getByRole("radio", { name: "English" }).click();
    await expect(page.getByText(englishOnlyText)).toBeVisible();
    await expect(page.getByText(russianOnlyText)).toHaveCount(0);
  });
});

test.describe("Preview page language detection", () => {
  test.use({ locale: "ru-RU" });

  test("opens in Russian for a Russian browser with no stored choice", async ({
    page,
  }) => {
    await page.goto(PREVIEW_URL);
    await expect(page.getByText(russianOnlyText)).toBeVisible();
  });
});

test.describe("Preview page language fallback", () => {
  test.use({ locale: "de-DE" });

  test("falls back to English for an unsupported browser language", async ({
    page,
  }) => {
    await page.goto(PREVIEW_URL);
    await expect(page.getByText(englishOnlyText)).toBeVisible();
  });
});
