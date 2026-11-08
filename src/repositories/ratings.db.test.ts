import { inspect } from "node:util";
import { afterAll, describe, expect, it } from "vitest";
import { createLiveTasting, createTestOwners } from "@/test-support/fixtures";
import { DatabaseError } from "./errors";
import {
  countProgressForOwner,
  listOwnRatings,
  listResultInputsForParticipant,
  listScoredRatingsForOwner,
  saveRating,
  type RatingValues,
} from "./ratings";
import { joinTasting } from "./participants";
import { advanceTastingStatus } from "./tastings";

const owners = createTestOwners();
afterAll(() => owners.cleanUp());

const values: RatingValues = {
  score: 7,
  note: "Körsbär och tjära",
  tags: ["fruity", "earthy"],
  guess: "Nebbiolo",
  sweetness: null,
  body: 9,
  astringency: 11,
  acidity: 8,
};

const resultClocks = { sweetness: null, body: 9, astringency: 11, acidity: 8 };

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
    await advanceTastingStatus(ownerId, tasting.id, "live");
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

  it("nekar smakklocka utanför 1–12 i databasen", async () => {
    const { participant, openWineId } = await createLiveTasting(owners);
    const error = await saveRating(participant, openWineId, {
      ...values,
      body: 13,
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      code: "23514",
      constraint_name: "ratings_body_range",
    });
  });

  it("ger ägaren poängen för resultatberäkningen", async () => {
    const { ownerId, tasting, participant, openWineId } =
      await createLiveTasting(owners);
    await saveRating(participant, openWineId, values);

    expect(await listScoredRatingsForOwner(ownerId, tasting.id)).toEqual([
      {
        wineId: openWineId,
        participantId: participant.id,
        score: 7,
        ...resultClocks,
      },
    ]);
    expect(
      await listScoredRatingsForOwner(owners.createOwnerId(), tasting.id),
    ).toBeNull();
  });

  it("ger deltagaren andras betyg och smeknamn först efter avslöjandet", async () => {
    const { ownerId, tasting, participant, openWineId } =
      await createLiveTasting(owners);
    await saveRating(participant, openWineId, values);

    expect(await listResultInputsForParticipant(participant)).toBeNull();

    await advanceTastingStatus(ownerId, tasting.id, "live");
    expect(await listResultInputsForParticipant(participant)).toEqual({
      ratings: [
        {
          wineId: openWineId,
          participantId: participant.id,
          score: 7,
          ...resultClocks,
        },
      ],
      participants: [{ id: participant.id, displayName: "Kim" }],
    });
  });

  it("ger deltagaren bara resultatet från den egna provningen", async () => {
    const first = await createLiveTasting(owners);
    const second = await createLiveTasting(owners);
    await saveRating(second.participant, second.openWineId, values);
    await advanceTastingStatus(first.ownerId, first.tasting.id, "live");
    await advanceTastingStatus(second.ownerId, second.tasting.id, "live");

    expect(await listResultInputsForParticipant(first.participant)).toEqual({
      ratings: [],
      participants: [{ id: first.participant.id, displayName: "Kim" }],
    });
  });
});

describe("förlopp för admin", () => {
  it("räknar deltagare och betyg per vin", async () => {
    const { ownerId, tasting, participant, openWineId } =
      await createLiveTasting(owners);
    const second = await joinTasting({
      code: tasting.code,
      displayName: "Lisa",
    });
    if (!second.ok) throw new Error("Kunde inte gå med");

    expect(await countProgressForOwner(ownerId, tasting.id)).toEqual({
      participantCount: 2,
      ratingCounts: [],
    });

    await saveRating(participant, openWineId, values);
    await saveRating(second.participant, openWineId, values);
    // Ett ändrat betyg räknas inte två gånger.
    await saveRating(participant, openWineId, { ...values, score: 3 });

    expect(await countProgressForOwner(ownerId, tasting.id)).toEqual({
      participantCount: 2,
      ratingCounts: [{ wineId: openWineId, ratingCount: 2 }],
    });
  });

  it("ger null för någon annans provning", async () => {
    const { tasting } = await createLiveTasting(owners);
    expect(
      await countProgressForOwner(owners.createOwnerId(), tasting.id),
    ).toBeNull();
  });
});
