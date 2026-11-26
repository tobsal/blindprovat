import { expect, test } from "@playwright/test";
import { advanceTastingStatus, createTasting } from "@/repositories/tastings";
import { createLiveTasting, createTestOwners } from "@/test-support/fixtures";
import { logInAsAdmin } from "./auth";

const owners = createTestOwners();
test.afterAll(() => owners.cleanUp());

test("admin kopierar länken och deltagaren går med via den", async ({
  browser,
  context,
  page,
}) => {
  const ownerId = owners.createOwnerId();
  const tasting = await createTasting(ownerId, { name: "Länkprovning" });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await logInAsAdmin(context, ownerId);
  await page.goto(`/admin/tastings/${tasting.id}`);

  await page.getByRole("button", { name: "Kopiera länk" }).press("Enter");
  await expect(page.getByText("Länken är kopierad.")).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).search).toBe(`?code=${tasting.code}`);

  // Deltagaren har en egen webbläsare utan adminsessionen.
  const participantContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
  });
  const participantPage = await participantContext.newPage();
  await participantPage.goto(link);
  await expect(participantPage.getByLabel("Provningskod")).toHaveValue(
    tasting.code,
  );
  await participantPage.getByLabel("Ditt namn").fill("Lisa");
  await participantPage.getByRole("button", { name: "Gå med" }).click();
  await expect(participantPage).toHaveURL(/\/tasting$/);
  await expect(participantPage.getByText("Du är med som Lisa")).toBeVisible();

  // Samma länk igen leder direkt tillbaka till provningen.
  await participantPage.goto(link);
  await expect(participantPage).toHaveURL(/\/tasting$/);
  await expect(participantPage.getByText("Du är med som Lisa")).toBeVisible();

  // En länk till en annan provning visar formuläret med den nya koden.
  const other = await createTasting(ownerId, { name: "Annan" });
  await participantPage.goto(`/?code=${other.code}`);
  await expect(participantPage.getByLabel("Provningskod")).toHaveValue(
    other.code,
  );
  await expect(
    participantPage.getByRole("link", { name: "Fortsätt till Länkprovning" }),
  ).toBeVisible();
  await participantContext.close();
});

test("länken visas för hand när den inte kan kopieras", async ({
  context,
  page,
}) => {
  const ownerId = owners.createOwnerId();
  const tasting = await createTasting(ownerId, { name: "Blockerad" });
  await context.addInitScript(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error("nekad"));
  });
  await logInAsAdmin(context, ownerId);
  await page.goto(`/admin/tastings/${tasting.id}`);

  await page.getByRole("button", { name: "Kopiera länk" }).click();
  await expect(page.getByText("Länken kunde inte kopieras.")).toBeVisible();
  await expect(page.getByLabel("Länk till provningen")).toHaveValue(
    new RegExp(`/\\?code=${tasting.code}$`),
  );
});

test("en avslöjad provning har ingen länk att kopiera", async ({
  context,
  page,
}) => {
  const { ownerId, tasting } = await createLiveTasting(owners);
  await advanceTastingStatus(ownerId, tasting.id, "live");
  await logInAsAdmin(context, ownerId);
  await page.goto(`/admin/tastings/${tasting.id}`);

  await expect(page.getByTestId("tasting-code")).toHaveText(tasting.code);
  await expect(page.getByRole("button", { name: "Kopiera länk" })).toHaveCount(
    0,
  );
});

test("en ogiltig kod i länken ger ett tomt fält", async ({ page }) => {
  await page.goto("/?code=fel");
  await expect(page.getByLabel("Provningskod")).toHaveValue("");
});
