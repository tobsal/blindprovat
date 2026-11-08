import { expect, test } from "@playwright/test";
import { joinTasting } from "@/repositories/participants";
import { saveRating, type RatingValues } from "@/repositories/ratings";
import {
  createLiveTasting,
  createTestOwners,
  noTasteClocks,
} from "@/test-support/fixtures";
import { advanceTastingStatus } from "@/repositories/tastings";
import { unwrap } from "@/test-support/unwrap";
import { logInAsAdmin } from "./auth";

const owners = createTestOwners();
test.afterAll(() => owners.cleanUp());

const noText: Omit<RatingValues, "score"> = {
  note: null,
  tags: [],
  guess: null,
  ...noTasteClocks,
};

test("admin ser resultatet med smeknamn efter avslöjandet", async ({
  context,
  page,
}) => {
  const { ownerId, tasting, participant, openWineId } =
    await createLiveTasting(owners);
  const lisa = unwrap(
    await joinTasting({ code: tasting.code, displayName: "Lisa" }),
    "Kunde inte gå med",
  );
  await saveRating(participant, openWineId, { ...noText, score: 8, body: 8 });
  await saveRating(lisa.participant, openWineId, {
    ...noText,
    score: 6,
    body: 11,
    acidity: 7,
  });

  await logInAsAdmin(context, ownerId);
  await page.goto(`/admin/tastings/${tasting.id}`);
  // Resultatet visas inte medan provningen pågår.
  await expect(page.getByRole("heading", { name: "Resultat" })).toHaveCount(0);

  await page.getByRole("button", { name: "Avsluta och avslöja" }).click();
  await page.getByRole("button", { name: "Ja, avsluta" }).click();

  const results = page.getByRole("region", { name: "Resultat" });
  await expect(results).toBeVisible();
  await expect(results).toContainText("Barolo Castiglione");
  await expect(results).toContainText("Snitt 7 av 10 · lägst 6 · högst 8");
  await expect(results).toContainText(
    "Smakklockor (snitt av 12): Fyllighet 9,5 · Fruktsyra 7",
  );
  await expect(results).toContainText("Kim");
  await expect(results).toContainText("Lisa");
});

test("deltagaren ser resultatet med smeknamn och eget betyg när provningen avslöjas", async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const { ownerId, tasting, participant, openWineId } =
    await createLiveTasting(owners);
  const lisa = unwrap(
    await joinTasting({ code: tasting.code, displayName: "Lisa" }),
    "Kunde inte gå med",
  );
  await saveRating(participant, openWineId, { ...noText, score: 8 });
  await saveRating(lisa.participant, openWineId, { ...noText, score: 6 });
  await context.addCookies([
    {
      name: "participant_session",
      value: lisa.sessionToken,
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/tasting");
  // Före avslöjandet syns varken vinnamn eller resultat.
  await expect(page.getByText("Barolo Castiglione")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Resultat" })).toHaveCount(0);

  await advanceTastingStatus(ownerId, tasting.id, "live");

  // Sidan hämtas på nytt av pollingen, utan omladdning.
  const results = page.getByRole("region", { name: "Resultat" });
  await expect(results).toBeVisible({ timeout: 10_000 });
  await expect(results).toContainText("Barolo Castiglione");
  await expect(results).toContainText("Ditt betyg: 6 av 10");
  await expect(results).toContainText("Lisa (du)");
  await expect(results).toContainText("Kim");
  // Andras enskilda poäng visas inte, bara gruppens sammanställning.
  await expect(results).not.toContainText("Ditt betyg: 8");
});
