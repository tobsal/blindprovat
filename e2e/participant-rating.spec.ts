import { expect, test, type BrowserContext } from "@playwright/test";
import { joinTasting } from "@/repositories/participants";
import { listOwnRatings } from "@/repositories/ratings";
import { advanceTastingStatus } from "@/repositories/tastings";
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
  await page.setViewportSize({ width: 375, height: 800 });
  const { tasting } = await createLiveTasting(owners);
  const participant = await joinWithCookie(context, tasting.code, "Lisa");
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

  // Vinet är rött: fyllighet, strävhet och fruktsyra, men inte sötma.
  await expect(page.getByRole("group", { name: "Sötma" })).toHaveCount(0);
  const body = page.getByRole("group", { name: "Fyllighet" });
  await body.getByRole("button", { name: "9 av 12" }).click();
  await expect(body.getByText("Du har valt 9 av 12.")).toBeVisible();
  const acidity = page.getByRole("group", { name: "Fruktsyra" });
  await acidity.getByRole("button", { name: "4 av 12" }).click();
  // Ett tryck till på det valda värdet tar bort valet.
  await acidity.getByRole("button", { name: "4 av 12" }).click();
  await expect(acidity.getByText("Inget valt.")).toBeVisible();

  await page.getByRole("button", { name: "Fruktigt" }).click();
  await page.getByRole("button", { name: "Ekfat" }).click();
  await page.getByLabel("Gissning (valfritt)").fill("Pinot noir");
  await page.getByLabel("Anteckning (valfritt)").fill("Körsbär och jord.");
  await page.getByRole("button", { name: "Spara betyg" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Betyget är sparat." }),
  ).toBeVisible();
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
  await expect(
    page
      .getByRole("group", { name: "Fyllighet" })
      .getByRole("button", { name: "9 av 12" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(await listOwnRatings(participant)).toEqual([
    expect.objectContaining({
      score: 8,
      sweetness: null,
      body: 9,
      astringency: null,
      acidity: null,
    }),
  ]);
});

test("sparknappen nås utan att skrolla och skymmer inte fokuserade fält", async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const { tasting } = await createLiveTasting(owners);
  await joinWithCookie(context, tasting.code, "Lisa");
  await page.goto("/tasting/wines/1");

  const save = page.getByRole("button", { name: "Spara betyg" });
  await expect(save).toBeInViewport();
  await expect(page.getByText("Inget betyg valt")).toBeVisible();
  await page.getByRole("button", { name: "7 av 10" }).click();
  await expect(page.getByText("Ditt betyg: 7 av 10")).toBeVisible();

  // Skrolla så att gissningen syns men ligger bakom den klistrade raden. När
  // den får fokus ska sidan skrolla så att den hamnar ovanför raden.
  const guess = page.getByLabel("Gissning (valfritt)");
  await guess.evaluate((element) => {
    const { bottom } = element.getBoundingClientRect();
    window.scrollBy(0, bottom - (window.innerHeight - 20));
  });
  await guess.focus();
  await expect(save).toBeInViewport();
  const guessBox = await guess.boundingBox();
  const saveBox = await save.boundingBox();
  expect(guessBox && saveBox).toBeTruthy();
  expect(guessBox!.y + guessBox!.height).toBeLessThanOrEqual(saveBox!.y);
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

  await expect(page.getByText("Välj ett betyg mellan 1 och 10")).toBeVisible();
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
  await expect(
    page.getByRole("button", { name: "Spara betyg" }),
  ).toBeDisabled();
  expect(await listOwnRatings(participant)).toEqual([]);
});

test("ett öppet vin låses när provningen avslöjas medan deltagaren skriver", async ({
  context,
  page,
}) => {
  const { ownerId, tasting } = await createLiveTasting(owners);
  const participant = await joinWithCookie(context, tasting.code, "Lisa");
  await page.goto("/tasting/wines/1");
  await page.getByLabel("Anteckning (valfritt)").fill("Hann inte spara");

  await advanceTastingStatus(ownerId, tasting.id, "live");

  await expect(
    page.getByText("Vinet har stängts för betyg.").first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Stängt", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Anteckning (valfritt)")).toHaveValue(
    "Hann inte spara",
  );
  await expect(
    page.getByRole("button", { name: "Spara betyg" }),
  ).toBeDisabled();
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
  await expect(page.getByRole("button", { name: "Spara betyg" })).toHaveCount(
    0,
  );
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

test("ett serverfel vid sparning visar ett fel och behåller det som skrivits", async ({
  context,
  page,
}) => {
  const { tasting } = await createLiveTasting(owners);
  const participant = await joinWithCookie(context, tasting.code, "Lisa");
  await page.goto("/tasting/wines/1");

  // Serveranrop skickas som POST med huvudet next-action. Det första får ett
  // fel från servern, som när databasen inte svarar.
  await page.route("**/tasting/wines/1", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await route.fulfill({ status: 500, body: "Internal Server Error" });
    } else {
      await route.continue();
    }
  });

  await page.getByRole("button", { name: "7 av 10" }).click();
  await page.getByLabel("Anteckning (valfritt)").fill("Fat och vanilj.");
  await page.getByRole("button", { name: "Spara betyg" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Något gick fel hos oss" }),
  ).toBeVisible();
  await expect(page.getByLabel("Anteckning (valfritt)")).toHaveValue(
    "Fat och vanilj.",
  );
  await expect(page.getByRole("button", { name: "7 av 10" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.unrouteAll();
  await page.getByRole("button", { name: "Spara betyg" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Betyget är sparat." }),
  ).toBeVisible();
  expect(await listOwnRatings(participant)).toEqual([
    expect.objectContaining({ score: 7, note: "Fat och vanilj." }),
  ]);
});

test("ett serverfel vid pollingen behåller formuläret och det som skrivits", async ({
  context,
  page,
}) => {
  const { ownerId, tasting, openWineId } = await createLiveTasting(owners);
  await joinWithCookie(context, tasting.code, "Lisa");
  await page.goto("/tasting/wines/1");
  await page.getByLabel("Anteckning (valfritt)").fill("Halvfärdig anteckning");

  // Pollingen är ett serveranrop (POST med huvudet next-action).
  await page.route("**/tasting/wines/1", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await route.fulfill({ status: 500, body: "Internal Server Error" });
    } else {
      await route.continue();
    }
  });

  await expect(
    page.getByRole("status").filter({ hasText: "Kunde inte hämta vinets" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "Något gick fel" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Anteckning (valfritt)")).toHaveValue(
    "Halvfärdig anteckning",
  );

  // När servern svarar igen fortsätter pollingen, och ett stängt vin syns.
  await page.unrouteAll();
  unwrap(await setWineOpen(ownerId, openWineId, false), "Kunde inte stänga");
  await expect(
    page.getByText("Vinet har stängts för betyg.").first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("status").filter({ hasText: "Kunde inte hämta vinets" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Anteckning (valfritt)")).toHaveValue(
    "Halvfärdig anteckning",
  );
});

test("utan uppkoppling finns det som skrivits kvar på vinsidan", async ({
  context,
  page,
}) => {
  const { tasting } = await createLiveTasting(owners);
  await joinWithCookie(context, tasting.code, "Lisa");
  await page.goto("/tasting/wines/1");
  await page.getByRole("button", { name: "6 av 10" }).click();
  await page.getByLabel("Anteckning (valfritt)").fill("Skriven offline");

  await context.setOffline(true);
  await expect(
    page.getByRole("status").filter({ hasText: "Ingen uppkoppling" }),
  ).toBeVisible();
  // Längre än ett pollintervall, så att en omladdning skulle ha hunnit ske.
  await page.waitForTimeout(6_000);
  await expect(page.getByLabel("Anteckning (valfritt)")).toHaveValue(
    "Skriven offline",
  );
  await expect(page.getByRole("button", { name: "6 av 10" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await context.setOffline(false);
  await expect(
    page.getByRole("status").filter({ hasText: "Ingen uppkoppling" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Spara betyg" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Betyget är sparat." }),
  ).toBeVisible();
});
