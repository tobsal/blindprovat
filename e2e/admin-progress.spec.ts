import { expect, test } from "@playwright/test";
import { joinTasting } from "@/repositories/participants";
import { saveRating } from "@/repositories/ratings";
import { createTasting } from "@/repositories/tastings";
import { addWine } from "@/repositories/wines";
import {
  createLiveTasting,
  createTestOwners,
  noTasteClocks,
  sampleWine,
} from "@/test-support/fixtures";
import { unwrap } from "@/test-support/unwrap";
import { logInAsAdmin } from "./auth";

const owners = createTestOwners();
test.afterAll(() => owners.cleanUp());

test("admin ser deltagare och betyg per vin uppdateras utan omladdning", async ({
  context,
  page,
}) => {
  const { ownerId, tasting, participant, openWineId } =
    await createLiveTasting(owners);
  await logInAsAdmin(context, ownerId);
  await page.goto(`/admin/tastings/${tasting.id}`);

  const firstRow = page.getByRole("listitem").nth(0);
  await expect(page.getByText("1 deltagare har gått med.")).toBeVisible();
  await expect(firstRow).toContainText("0 av 1 har betygsatt");

  await saveRating(participant, openWineId, {
    score: 7,
    note: null,
    tags: [],
    guess: null,
    ...noTasteClocks,
  });
  await expect(firstRow).toContainText("1 av 1 har betygsatt", {
    timeout: 10_000,
  });

  unwrap(
    await joinTasting({ code: tasting.code, displayName: "Lisa" }),
    "Kunde inte gå med",
  );
  await expect(page.getByText("2 deltagare har gått med.")).toBeVisible({
    timeout: 10_000,
  });
  await expect(firstRow).toContainText("1 av 2 har betygsatt");
});

test("deltagare som går med syns medan provningen förbereds, och inmatningen finns kvar", async ({
  context,
  page,
}) => {
  const ownerId = owners.createOwnerId();
  const tasting = await createTasting(ownerId, { name: "Förbereds" });
  unwrap(
    await addWine(ownerId, tasting.id, sampleWine),
    "Kunde inte lägga till vin",
  );
  await logInAsAdmin(context, ownerId);
  await page.goto(`/admin/tastings/${tasting.id}`);
  await expect(
    page.getByText("Ingen deltagare har gått med än."),
  ).toBeVisible();

  await page.getByLabel("Namn", { exact: true }).fill("Halvskrivet vin");
  unwrap(
    await joinTasting({ code: tasting.code, displayName: "Lisa" }),
    "Kunde inte gå med",
  );

  await expect(page.getByText("1 deltagare har gått med.")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByLabel("Namn", { exact: true })).toHaveValue(
    "Halvskrivet vin",
  );
});
