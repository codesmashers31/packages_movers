import { expect, type Page } from "@playwright/test";

export async function register(
  page: Page,
  email = "bala@example.com",
  name = "Bala",
) {
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill(name);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.getByLabel("6-digit code", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify & create account" }).click();
  await expect(
    page.getByRole("button", { name: "Plan my move" }),
  ).toBeVisible();
}
