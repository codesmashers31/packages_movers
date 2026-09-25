import { test, expect } from "@playwright/test";
import { register } from "./support";

test("phone layout and complete local moving preview", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await register(page);
  await expect(page.getByRole("button", { name: "Plan my move" })).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByRole("button", { name: "Plan my move" })).toHaveCSS(
    "background-color",
    "rgb(210, 242, 158)",
  );
  await page.screenshot({ path: "artifacts/home-mobile.png" });
  await page.getByRole("button", { name: "Plan my move" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("Add a complete pickup and drop address", { exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Moving from", { exact: true })
    .fill("12 Sample Street, Chennai");
  await page
    .getByLabel("Moving to", { exact: true })
    .fill("45 Example Road, Chennai");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const date = new Date();
  date.setDate(date.getDate() + 3);
  const dateText = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  await page.getByLabel("Or choose another date (YYYY-MM-DD)").fill(dateText);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Add one Boxes" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Preview matching quotes" }).click();
  await expect(
    page.getByText("Find your moving crew", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/quotes-mobile.png" });
  await page.getByRole("button", { name: "Lowest price", exact: true }).click();
  await page
    .getByRole("radio", { name: /Select Neighbourhood Movers/ })
    .click();
  await page.getByRole("button", { name: "Save demo booking" }).click();
  await expect(
    page.getByText("Your demo plan is saved on this device."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to My Moves" }).click();
  await expect(page.getByText("SAVED DEMO PLAN")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("local-movers-design-v1:bala@example.com"),
      ),
    )
    .toContain("Neighbourhood Movers");
  await page.reload();
  await page.getByRole("tab", { name: /My Moves/ }).click();
  await expect(page.getByText("SAVED DEMO PLAN")).toBeVisible();
  await page.getByRole("tab", { name: /Profile/ }).click();
  await page.getByRole("button", { name: /Explore worker view/ }).click();
  await page.getByRole("button", { name: "Explore sample assignment" }).click();
  await page.getByRole("button", { name: "Accept sample assignment" }).click();
  await expect(
    page.getByRole("button", { name: "Mark: En route to pickup" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("compact phone layout has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await register(page);
  await expect(
    page.getByRole("button", { name: "Plan my move" }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(360);
  await page.getByRole("button", { name: "Choose your locality" }).click();
  await page.getByLabel("City or locality").fill("Madurai");
  await page.getByRole("button", { name: "Use this locality" }).click();
  await expect(page.getByText("Madurai", { exact: true })).toBeVisible();
  await page.getByLabel("Search moving services").fill("packing");
  await expect(
    page.getByRole("button", { name: /Packing A little extra care/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Full home Every room/ }),
  ).toHaveCount(0);
});
