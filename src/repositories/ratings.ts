import { and, eq } from "drizzle-orm";
import type { ScoredRating } from "@/domain/results";
import { canRateWines } from "@/domain/tasting";
import { db } from "./db";
import type { SessionParticipant } from "./participants";
import { ratings, tastings, wines } from "./schema";

type Rating = typeof ratings.$inferSelect;

export type RatingValues = Pick<Rating, "score" | "note" | "tags" | "guess">;

export type OwnRating = RatingValues & Pick<Rating, "wineId">;

export type SaveRatingResult =
  | { ok: true; rating: OwnRating }
  | { ok: false; error: "not_found" | "invalid_state" };

const ownRatingColumns = {
  wineId: ratings.wineId,
  score: ratings.score,
  note: ratings.note,
  tags: ratings.tags,
  guess: ratings.guess,
};

export async function saveRating(
  participant: SessionParticipant,
  wineId: string,
  values: RatingValues,
): Promise<SaveRatingResult> {
  return db.transaction(async (tx) => {
    // Låser vinet så att det inte kan stängas mellan kontrollen och skrivningen.
    const [wine] = await tx
      .select({ isOpen: wines.isOpen, status: tastings.status })
      .from(wines)
      .innerJoin(tastings, eq(wines.tastingId, tastings.id))
      .where(
        and(eq(wines.id, wineId), eq(wines.tastingId, participant.tastingId)),
      )
      .for("update");
    if (!wine) return { ok: false, error: "not_found" };
    if (!wine.isOpen || !canRateWines(wine.status)) {
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
  });
}

export async function listOwnRatings(
  participant: SessionParticipant,
): Promise<OwnRating[]> {
  return db
    .select(ownRatingColumns)
    .from(ratings)
    .where(eq(ratings.participantId, participant.id));
}

// null om provningen inte finns eller ägs av någon annan.
export async function listScoredRatings(
  ownerId: string,
  tastingId: string,
): Promise<ScoredRating[] | null> {
  const [tasting] = await db
    .select({ id: tastings.id })
    .from(tastings)
    .where(and(eq(tastings.id, tastingId), eq(tastings.ownerId, ownerId)));
  if (!tasting) return null;

  return db
    .select({
      wineId: ratings.wineId,
      participantId: ratings.participantId,
      score: ratings.score,
    })
    .from(ratings)
    .innerJoin(wines, eq(ratings.wineId, wines.id))
    .where(eq(wines.tastingId, tastingId));
}
