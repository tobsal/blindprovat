import { expect, test } from "@playwright/test";
import { createE2eOwnerId, logInAsAdmin } from "./auth";

test("utloggad besökare skickas till inloggningen", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Logga in" })).toBeVisible();
});

test("inloggad admin kommer till sina provningar", async ({
  context,
  page,
}) => {
  await logInAsAdmin(context, createE2eOwnerId());
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Dina provningar" }),
  ).toBeVisible();
});
