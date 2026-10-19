import { expect, test } from "@playwright/test";

test("okänd adress visar en svensk sida med väg vidare", async ({ page }) => {
  const response = await page.goto("/finns-inte");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Sidan finns inte" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Till startsidan" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Blindprovat" })).toBeVisible();
});
