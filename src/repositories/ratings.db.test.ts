import { inspect } from "node:util";
import { afterAll, describe, expect, it } from "vitest";
import { createLiveTasting, createTestOwners } from "@/test-support/fixtures";
import { DatabaseError } from "./errors";
import {
  listOwnRatings,
  listScoredRatingsForOwner,
  saveRating,
  type RatingValues,
} from "./ratings";
import { advanceTastingStatus } from "./tastings";

const owners = createTestOwners();
afterAll(() => owners.cleanUp());

const values: RatingValues = {
  score: 7,
  note: "Körsbär och tjära",
  tags: ["fruity", "tannic"],
  guess: "Nebbiolo",
};

describe("betyg", () => {
  it("sparar och ändrar betyget, högst ett per vin", async () => {
    const { participant, openWineId } = await createLiveTasting(owners);

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
    const { participant, closedWineId } = await createLiveTasting(owners);
    expect(await saveRating(participant, closedWineId, values)).toEqual({
      ok: false,
      error: "invalid_state",
    });
  });

  it("nekar betyg på vin i en annan provning", async () => {
    const { participant } = await createLiveTasting(owners);
    const other = await createLiveTasting(owners);
    expect(await saveRating(participant, other.openWineId, values)).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("nekar betyg när provningen är avslöjad", async () => {
    const { ownerId, tasting, participant, openWineId } =
      await createLiveTasting(owners);
    await advanceTastingStatus(ownerId, tasting.id);
    expect(await saveRating(participant, openWineId, values)).toEqual({
      ok: false,
      error: "invalid_state",
    });
  });

  it("kastar databasfel utan anteckningen i felet", async () => {
    const { participant, openWineId } = await createLiveTasting(owners);
    // Poängen bryter mot CHECK-constrainten. Postgres lägger då hela raden,
    // med anteckningen, i felets detail.
    const error = await saveRating(participant, openWineId, {
      ...values,
      score: 99,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error).toMatchObject({
      code: "23514",
      constraint_name: "ratings_score_range",
    });
    const logged = inspect(error, { depth: Infinity });
    expect(logged).not.toContain(values.note);
    expect(logged).not.toContain(values.guess);
  });

  it("ger ägaren poängen för resultatberäkningen", async () => {
    const { ownerId, tasting, participant, openWineId } =
      await createLiveTasting(owners);
    await saveRating(participant, openWineId, values);

    expect(await listScoredRatingsForOwner(ownerId, tasting.id)).toEqual([
      { wineId: openWineId, participantId: participant.id, score: 7 },
    ]);
    expect(
      await listScoredRatingsForOwner(owners.createOwnerId(), tasting.id),
    ).toBeNull();
  });
});
