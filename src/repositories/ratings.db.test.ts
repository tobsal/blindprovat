import { afterAll, describe, expect, it } from "vitest";
import { joinTasting } from "./participants";
import {
  listOwnRatings,
  listScoredRatings,
  saveRating,
  type RatingValues,
} from "./ratings";
import { advanceTastingStatus, createTasting } from "./tastings";
import { createTestOwners, sampleWine } from "./test-fixtures";
import { addWine, setWineOpen } from "./wines";

const owners = createTestOwners();
afterAll(() => owners.cleanUp());

const values: RatingValues = {
  score: 7,
  note: "Körsbär och tjära",
  tags: ["fruity", "tannic"],
  guess: "Nebbiolo",
};

// En pågående provning med ett öppet och ett stängt vin och en deltagare.
async function createLiveTasting() {
  const ownerId = owners.createOwnerId();
  const tasting = await createTasting(ownerId, { name: "Betyg" });
  const openWine = await addWine(ownerId, tasting.id, sampleWine);
  const closedWine = await addWine(ownerId, tasting.id, sampleWine);
  if (!openWine.ok || !closedWine.ok) throw new Error("Kunde inte lägga till vin");
  await advanceTastingStatus(ownerId, tasting.id);
  await setWineOpen(ownerId, openWine.wine.id, true);
  const joined = await joinTasting({ code: tasting.code, displayName: "Kim" });
  if (!joined.ok) throw new Error("Kunde inte gå med");
  return {
    ownerId,
    tasting,
    participant: joined.participant,
    openWineId: openWine.wine.id,
    closedWineId: closedWine.wine.id,
  };
}

describe("betyg", () => {
  it("sparar och ändrar betyget, högst ett per vin", async () => {
    const { participant, openWineId } = await createLiveTasting();

    expect(await saveRating(participant, openWineId, values)).toEqual({
      ok: true,
      rating: { ...values, wineId: openWineId },
    });
    await saveRating(participant, openWineId, { ...values, score: 9 });

    expect(await listOwnRatings(participant)).toEqual([
      { ...values, score: 9, wineId: openWineId },
    ]);
  });

  it("nekar betyg på stängt vin", async () => {
    const { participant, closedWineId } = await createLiveTasting();
    expect(await saveRating(participant, closedWineId, values)).toEqual({
      ok: false,
      error: "invalid_state",
    });
  });

  it("nekar betyg på vin i en annan provning", async () => {
    const { participant } = await createLiveTasting();
    const other = await createLiveTasting();
    expect(await saveRating(participant, other.openWineId, values)).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("nekar betyg när provningen är avslöjad", async () => {
    const { ownerId, tasting, participant, openWineId } =
      await createLiveTasting();
    await advanceTastingStatus(ownerId, tasting.id);
    expect(await saveRating(participant, openWineId, values)).toEqual({
      ok: false,
      error: "invalid_state",
    });
  });

  it("ger ägaren poängen för resultatberäkningen", async () => {
    const { ownerId, tasting, participant, openWineId } =
      await createLiveTasting();
    await saveRating(participant, openWineId, values);

    expect(await listScoredRatings(ownerId, tasting.id)).toEqual([
      { wineId: openWineId, participantId: participant.id, score: 7 },
    ]);
    expect(
      await listScoredRatings(owners.createOwnerId(), tasting.id),
    ).toBeNull();
  });
});
