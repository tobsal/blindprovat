import { expect, test } from "@playwright/test";
import { advanceTastingStatus } from "@/repositories/tastings";
import { createLiveTasting, createTestOwners } from "@/test-support/fixtures";

const owners = createTestOwners();
test.afterAll(() => owners.cleanUp());

const unknownCodeMessage =
  "Vi hittar ingen provning med den koden. Kontrollera koden eller fråga den som håller i provningen.";

test("deltagare går med via kod och landar i provningen", async ({ page }) => {
  const { tasting } = await createLiveTasting(owners);
  await page.goto("/");

  // Koden går att skriva med gemener och mellanslag.
  await page
    .getByLabel("Provningskod")
    .fill(tasting.code.toLowerCase().replace(/^(.{5})/, "$1 "));
  await page.getByLabel("Ditt namn").fill("Lisa");
  await page.getByRole("button", { name: "Gå med" }).click();

  await expect(page).toHaveURL(/\/tasting$/);
  await expect(page.getByRole("heading", { name: "Betyg" })).toBeVisible();
  await expect(page.getByText("Du är med som Lisa.")).toBeVisible();

  // Sessionen finns kvar vid omladdning.
  await page.reload();
  await expect(page.getByText("Du är med som Lisa.")).toBeVisible();
});

test("fel kod ger ett fel vid fältet och behåller det som skrivits", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Provningskod").fill("ABCDE23456");
  await page.getByLabel("Ditt namn").fill("Lisa");
  await page.getByRole("button", { name: "Gå med" }).click();

  await expect(page.getByText(unknownCodeMessage)).toBeVisible();
  await expect(page.getByLabel("Provningskod")).toBeFocused();
  await expect(page.getByLabel("Provningskod")).toHaveValue("ABCDE23456");
  await expect(page.getByLabel("Ditt namn")).toHaveValue("Lisa");
});

test("en avslöjad provning ger samma svar som en okänd kod", async ({
  page,
}) => {
  const { ownerId, tasting } = await createLiveTasting(owners);
  await advanceTastingStatus(ownerId, tasting.id);

  await page.goto("/");
  await page.getByLabel("Provningskod").fill(tasting.code);
  await page.getByLabel("Ditt namn").fill("Lisa");
  await page.getByRole("button", { name: "Gå med" }).click();

  await expect(page.getByText(unknownCodeMessage)).toBeVisible();
});

test("upptaget namn ger ett fel vid namnfältet", async ({ page }) => {
  const { tasting } = await createLiveTasting(owners);
  await page.goto("/");
  await page.getByLabel("Provningskod").fill(tasting.code);
  await page.getByLabel("Ditt namn").fill("Kim");
  await page.getByRole("button", { name: "Gå med" }).click();

  await expect(
    page.getByText("Det namnet används redan i provningen. Välj ett annat."),
  ).toBeVisible();
  await expect(page.getByLabel("Ditt namn")).toBeFocused();
  await expect(page.getByLabel("Provningskod")).toHaveValue(tasting.code);
});

test("utan session skickas besökaren från provningen till startsidan", async ({
  page,
}) => {
  await page.goto("/tasting");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Provningskod")).toBeVisible();
});
