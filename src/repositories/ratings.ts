import { and, eq } from "drizzle-orm";
import type { ClockRating, ScoredRating } from "@/domain/results";
import { canRateWines, canShowResults } from "@/domain/tasting";
import { db } from "./db";
import { withSafeErrors } from "./errors";
import { tastingOwnedBy } from "./ownership";
import type { ParticipantName, SessionParticipant } from "./participants";
import type { RepositoryResult } from "./result";
import { participants, ratings, tastings, wines } from "./schema";

type Rating = typeof ratings.$inferSelect;

export type RatingValues = Pick<
  Rating,
  | "score"
  | "note"
  | "tags"
  | "guess"
  | "sweetness"
  | "body"
  | "astringency"
  | "acidity"
>;

export type OwnRating = RatingValues & Pick<Rating, "wineId">;

const ownRatingColumns = {
  wineId: ratings.wineId,
  score: ratings.score,
  note: ratings.note,
  tags: ratings.tags,
  guess: ratings.guess,
  sweetness: ratings.sweetness,
  body: ratings.body,
  astringency: ratings.astringency,
  acidity: ratings.acidity,
};

// Betyg och smakklockor för resultatet, utan anteckningar och gissningar.
const resultRatingColumns = {
  wineId: ratings.wineId,
  participantId: ratings.participantId,
  score: ratings.score,
  sweetness: ratings.sweetness,
  body: ratings.body,
  astringency: ratings.astringency,
  acidity: ratings.acidity,
};

export type ResultRating = ScoredRating & ClockRating;

export async function saveRating(
  participant: SessionParticipant,
  wineId: string,
  values: RatingValues,
): Promise<RepositoryResult<{ rating: OwnRating }>> {
  return withSafeErrors("saveRating", () =>
    db.transaction(async (tx) => {
      // Delat lås på provningen, så att den inte kan avslöjas och vinet inte
      // stängas mellan kontrollen och skrivningen. Betyg kan sparas samtidigt.
      // Låset tas i en egen fråga så att nästa fråga ser allt som var
      // committat när låset beviljades (låsregeln står i wines.ts).
      const [tasting] = await tx
        .select({ status: tastings.status })
        .from(tastings)
        .where(eq(tastings.id, participant.tastingId))
        .for("share");
      if (!tasting) return { ok: false, error: "not_found" };

      const [wine] = await tx
        .select({ isOpen: wines.isOpen })
        .from(wines)
        .where(
          and(eq(wines.id, wineId), eq(wines.tastingId, participant.tastingId)),
        );
      if (!wine) return { ok: false, error: "not_found" };
      if (!wine.isOpen || !canRateWines(tasting.status)) {
        return { ok: false, error: "invalid_state" };
      }

      const [rating] = await tx
        .insert(ratings)
        .values({ ...values, wineId, participantId: participant.id })
        .onConflictDoUpdate({
          target: [ratings.wineId, ratings.participantId],
          set: { ...values, updatedAt: new Date() },
        })
        .returning(ownRatingColumns);
      return { ok: true, rating };
    }),
  );
}

export async function listOwnRatings(
  participant: SessionParticipant,
): Promise<OwnRating[]> {
  return withSafeErrors("listOwnRatings", () =>
    db
      .select(ownRatingColumns)
      .from(ratings)
      .where(eq(ratings.participantId, participant.id)),
  );
}

// null om provningen inte finns eller ägs av någon annan.
export async function listScoredRatingsForOwner(
  ownerId: string,
  tastingId: string,
): Promise<ResultRating[] | null> {
  return withSafeErrors("listScoredRatingsForOwner", async () => {
    const [tasting] = await db
      .select({ id: tastings.id })
      .from(tastings)
      .where(tastingOwnedBy(ownerId, tastingId));
    if (!tasting) return null;

    return db
      .select(resultRatingColumns)
      .from(ratings)
      .innerJoin(wines, eq(ratings.wineId, wines.id))
      .where(eq(wines.tastingId, tastingId));
  });
}

export type ParticipantResultInputs = {
  ratings: ResultRating[];
  participants: ParticipantName[];
};

// Andras betyg och smeknamn hämtas inte ens från databasen före avslöjandet:
// null tills provningen är avslöjad. Statusen går bara framåt, så en samtidig
// ändring kan som värst dölja resultatet en gång för mycket, aldrig visa det
// för tidigt. Bara deltagarens egen provning går att läsa, via sessionen.
export async function listResultInputsForParticipant(
  participant: SessionParticipant,
): Promise<ParticipantResultInputs | null> {
  return withSafeErrors("listResultInputsForParticipant", async () => {
    const { tastingId } = participant;
    const [tasting] = await db
      .select({ status: tastings.status })
      .from(tastings)
      .where(eq(tastings.id, tastingId));
    if (!tasting || !canShowResults(tasting.status)) return null;

    const [scoredRatings, names] = await Promise.all([
      db
        .select(resultRatingColumns)
        .from(ratings)
        .innerJoin(wines, eq(ratings.wineId, wines.id))
        .where(eq(wines.tastingId, tastingId)),
      db
        .select({ id: participants.id, displayName: participants.displayName })
        .from(participants)
        .where(eq(participants.tastingId, tastingId)),
    ]);
    return { ratings: scoredRatings, participants: names };
  });
}
