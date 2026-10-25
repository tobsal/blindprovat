import { expect, test, type BrowserContext } from "@playwright/test";
import { joinTasting } from "@/repositories/participants";
import { listOwnRatings } from "@/repositories/ratings";
import { setWineOpen } from "@/repositories/wines";
import { createLiveTasting, createTestOwners } from "@/test-support/fixtures";
import { unwrap } from "@/test-support/unwrap";

const owners = createTestOwners();
test.afterAll(() => owners.cleanUp());

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

test("deltagaren betygsätter ett öppet vin och ser betyget i listan", async ({
  context,
  page,
}) => {
  const { tasting } = await createLiveTasting(owners);
  await joinWithCookie(context, tasting.code, "Lisa");
  await page.goto("/tasting");

  await page.getByRole("link", { name: "Betygsätt vin 1" }).click();
  await expect(page).toHaveURL(/\/tasting\/wines\/1$/);
  await expect(page.getByRole("heading", { name: "Vin 1" })).toBeVisible();

  await page.getByRole("button", { name: "8 av 10" }).click();
  await expect(page.getByRole("button", { name: "8 av 10" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("Du har valt 8 av 10.")).toBeVisible();
  await page.getByRole("button", { name: "Fruktigt" }).click();
  await page.getByRole("button", { name: "Ekfat" }).click();
  await page.getByLabel("Gissning (valfritt)").fill("Pinot noir");
  await page.getByLabel("Anteckning (valfritt)").fill("Körsbär och jord.");
  await page.getByRole("button", { name: "Spara betyg" }).click();

  await expect(page.getByRole("status")).toHaveText("Betyget är sparat.");
  // Det som skrivits finns kvar efter att formuläret skickats.
  await expect(page.getByLabel("Anteckning (valfritt)")).toHaveValue(
    "Körsbär och jord.",
  );
  await expect(page.getByRole("button", { name: "Ekfat" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("link", { name: "Tillbaka till alla viner" }).click();
  await expect(page.getByRole("listitem").first()).toContainText(
    "Betygsatt · 8 av 10 · öppet",
  );

  // Ett sparat betyg läses in igen när vinet öppnas på nytt.
  await page.getByRole("link", { name: /Vin 1/ }).first().click();
  await expect(page.getByRole("button", { name: "8 av 10" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Gissning (valfritt)")).toHaveValue(
    "Pinot noir",
  );
});

test("betyg utan poäng ger ett fel vid poängen och behåller texten", async ({
  context,
  page,
}) => {
  const { tasting } = await createLiveTasting(owners);
  await joinWithCookie(context, tasting.code, "Lisa");
  await page.goto("/tasting/wines/1");

  await page.getByLabel("Anteckning (valfritt)").fill("Glöm inte mig");
  await page.getByRole("button", { name: "Spara betyg" }).click();

  await expect(
    page.getByText("Välj ett betyg mellan 1 och 10"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "1 av 10" })).toBeFocused();
  await expect(page.getByLabel("Anteckning (valfritt)")).toHaveValue(
    "Glöm inte mig",
  );
});

test("ett vin som stängs medan deltagaren skriver låser formuläret men behåller texten", async ({
  context,
  page,
}) => {
  const { ownerId, tasting, openWineId } = await createLiveTasting(owners);
  const participant = await joinWithCookie(context, tasting.code, "Lisa");
  await page.goto("/tasting/wines/1");
  await page.getByLabel("Anteckning (valfritt)").fill("Halvfärdig anteckning");

  unwrap(await setWineOpen(ownerId, openWineId, false), "Kunde inte stänga");

  await expect(
    page.getByText("Vinet har stängts för betyg.").first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Anteckning (valfritt)")).toHaveValue(
    "Halvfärdig anteckning",
  );
  await expect(page.getByRole("button", { name: "Spara betyg" })).toBeDisabled();
  expect(await listOwnRatings(participant)).toEqual([]);
});

test("ett vin som inte är öppet går inte att betygsätta", async ({
  context,
  page,
}) => {
  const { tasting } = await createLiveTasting(owners);
  await joinWithCookie(context, tasting.code, "Lisa");
  await page.goto("/tasting/wines/2");

  await expect(page.getByText(/inte öppet för betyg ännu/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Spara betyg" })).toHaveCount(0);
});

test("okänt eller ogiltigt vin ger samma sida", async ({ context, page }) => {
  const { tasting } = await createLiveTasting(owners);
  await joinWithCookie(context, tasting.code, "Lisa");
  for (const blindNumber of ["99", "abc", "0"]) {
    await page.goto(`/tasting/wines/${blindNumber}`);
    await expect(
      page.getByRole("heading", { name: "Vinet finns inte" }),
    ).toBeVisible();
  }
});
