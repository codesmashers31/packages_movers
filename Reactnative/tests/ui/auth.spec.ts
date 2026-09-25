import { test, expect } from "@playwright/test";
import { register } from "./support";

test("email registration, OTP errors, persistent login and logout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByText("Welcome home.", { exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/login-mobile.png" });
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("bala@example.com");
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(
    page.getByText("No local account found. Create an account first."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("Bala");
  await page.screenshot({ path: "artifacts/register-mobile.png" });
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(
    page.getByText("UI preview: enter 123456. No email is sent."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resend code", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Verify & create account" }),
  ).toBeDisabled();
  await page.getByLabel("6-digit code", { exact: true }).fill("111111");
  await page.getByRole("button", { name: "Verify & create account" }).click();
  await expect(
    page.getByText("That code does not match. Use the preview code 123456."),
  ).toBeVisible();
  await page.getByLabel("6-digit code", { exact: true }).fill("123456");
  await page.screenshot({ path: "artifacts/otp-mobile.png" });
  await page.getByRole("button", { name: "Verify & create account" }).click();
  await page.reload();
  await page.getByRole("tab", { name: /Profile/ }).click();
  await expect(page.getByText("Hello, Bala.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.reload();
  await expect(page.getByText("Welcome home.", { exact: true })).toBeVisible();
  await page
    .getByLabel("Email address", { exact: true })
    .fill(" BALA@example.com ");
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.getByLabel("6-digit code", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify & log in" }).click();
  await expect(
    page.getByRole("button", { name: "Plan my move" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("local profiles keep separate drafts and reject duplicate registration", async ({
  page,
}) => {
  await page.goto("/");
  await register(page);
  await page.getByRole("button", { name: "Plan my move" }).click();
  await page
    .getByLabel("Moving from", { exact: true })
    .fill("12 Bala sample address");
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("local-movers-design-v1:bala@example.com"),
      ),
    )
    .toContain("12 Bala sample address");
  await page.getByRole("button", { name: "Go back" }).click();
  await page.getByRole("tab", { name: /Profile/ }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("Bala");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("BALA@example.com");
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(
    page.getByText(
      "This email is already registered on this device. Log in instead.",
    ),
  ).toBeVisible();
  await register(page, "second@example.com", "Second");
  await page.getByRole("button", { name: "Plan my move" }).click();
  await expect(page.getByLabel("Moving from", { exact: true })).toHaveValue("");
});

test("compact auth layout, change email, resend and expired code", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("Bala");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("bala@example.com");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(360);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.getByRole("button", { name: "Change email" }).click();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("corrected@example.com");
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(
    page.getByText("corrected@example.com", { exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(301_000);
  await expect(
    page.getByText("Code expired. Request a new one below."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resend code", exact: true }).click();
  await page.getByLabel("6-digit code", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify & create account" }).click();
  await expect(
    page.getByRole("button", { name: "Plan my move" }),
  ).toBeVisible();
});
