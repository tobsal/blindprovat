import { expect, test, type BrowserContext } from "@playwright/test";
import { joinTasting } from "@/repositories/participants";
import { saveRating } from "@/repositories/ratings";
import { setWineOpen } from "@/repositories/wines";
import { createLiveTasting, createTestOwners } from "@/test-support/fixtures";
import { unwrap } from "@/test-support/unwrap";

const owners = createTestOwners();
test.afterAll(() => owners.cleanUp());

// Går med direkt i databasen och lägger sessionen i webbläsaren. Själva
// anslutningen testas i participant-join.spec.ts.
async function joinWithCookie(
  context: BrowserContext,
  code: string,
  displayName: string,
) {
  const joined = unwrap(
    await joinTasting({ code, displayName }),
    "Kunde inte gå med",
  );
  await context.addCookies([
    {
      name: "participant_session",
      value: joined.sessionToken,
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return joined.participant;
}

test("deltagaren ser blindnummer och status men aldrig vininformation", async ({
  context,
  page,
}) => {
  const { tasting } = await createLiveTasting(owners);
  await joinWithCookie(context, tasting.code, "Lisa");
  await page.goto("/tasting");

  await expect(
    page.getByRole("heading", { name: "Vin 1 är öppet för betyg" }),
  ).toBeVisible();
  const items = page.getByRole("listitem");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("Vin 1");
  await expect(items.nth(0)).toContainText("Öppet · inte betygsatt än");
  await expect(items.nth(1)).toContainText("Vin 2");
  await expect(items.nth(1)).toContainText("Inte öppet");

  await expect(page.locator("body")).not.toContainText("Barolo");
  await expect(page.locator("body")).not.toContainText("Vietti");
});

test("ett betygsatt vin visar det egna betyget", async ({ context, page }) => {
  const { tasting, openWineId } = await createLiveTasting(owners);
  const participant = await joinWithCookie(context, tasting.code, "Lisa");
  unwrap(
    await saveRating(participant, openWineId, {
      score: 8,
      note: null,
      tags: [],
      guess: null,
    }),
    "Kunde inte spara betyg",
  );
  await page.goto("/tasting");

  await expect(page.getByRole("listitem").first()).toContainText(
    "Betygsatt · 8 av 10 · öppet",
  );
  // Ett vin som redan är betygsatt får ingen uppmaning att betygsätta.
  await expect(page.getByRole("heading", { level: 2, name: /öppet för betyg/ })).toHaveCount(0);
});

test("ett vin som öppnas visas utan omladdning av sidan", async ({
  context,
  page,
}) => {
  const { ownerId, tasting, openWineId, closedWineId } =
    await createLiveTasting(owners);
  await joinWithCookie(context, tasting.code, "Lisa");
  await page.goto("/tasting");
  await expect(
    page.getByRole("heading", { name: "Vin 1 är öppet för betyg" }),
  ).toBeVisible();

  // Markören försvinner om sidan laddas om i stället för att uppdateras.
  await page.evaluate(() => {
    (window as unknown as { pollMarker: boolean }).pollMarker = true;
  });
  unwrap(await setWineOpen(ownerId, openWineId, false), "Kunde inte stänga");
  unwrap(await setWineOpen(ownerId, closedWineId, true), "Kunde inte öppna");

  await expect(
    page.getByRole("heading", { name: "Vin 2 är öppet för betyg" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("listitem").first()).toContainText(
    "Inte öppet",
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { pollMarker?: boolean }).pollMarker,
    ),
  ).toBe(true);
});
