import { expect, test } from "@playwright/test";
import { joinTasting } from "@/repositories/participants";
import { saveRating, type RatingValues } from "@/repositories/ratings";
import { createLiveTasting, createTestOwners } from "@/test-support/fixtures";
import { unwrap } from "@/test-support/unwrap";
import { logInAsAdmin } from "./auth";

const owners = createTestOwners();
test.afterAll(() => owners.cleanUp());

const noText: Omit<RatingValues, "score"> = {
  note: null,
  tags: [],
  guess: null,
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
  await saveRating(participant, openWineId, { ...noText, score: 8 });
  await saveRating(lisa.participant, openWineId, { ...noText, score: 6 });

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
  await expect(results).toContainText("Kim");
  await expect(results).toContainText("Lisa");
});
