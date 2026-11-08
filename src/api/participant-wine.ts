import { notFound } from "next/navigation";
import type { WineType } from "@/domain/wine";
import type { SessionParticipant } from "@/repositories/participants";
import { listOwnRatings, type RatingValues } from "@/repositories/ratings";
import { listWinesForParticipant } from "@/repositories/wines";
import { blindNumberSchema } from "@/validation/wine";
import { requireParticipant } from "./participant-session";

export type ParticipantWineDetail = {
  blindNumber: number;
  isOpen: boolean;
  // Styr vilka smakklockor som visas. null för viner utan vintyp.
  type: WineType | null;
  // null om deltagaren inte har betygsatt vinet.
  rating: RatingValues | null;
  previousBlindNumber: number | null;
  nextBlindNumber: number | null;
};

// Vinet slås upp i deltagarens egen provning via blindnumret. Det som skickas
// vidare är bara blindnummer, vintyp, öppet eller stängt och det egna
// betyget.
export async function findWineForParticipant(
  participant: SessionParticipant,
  blindNumber: number,
) {
  const wines = await listWinesForParticipant(participant);
  const index = wines.findIndex((wine) => wine.blindNumber === blindNumber);
  if (index === -1) return null;
  return {
    id: wines[index].id,
    blindNumber,
    isOpen: wines[index].isOpen,
    type: wines[index].type,
    previousBlindNumber: wines[index - 1]?.blindNumber ?? null,
    nextBlindNumber: wines[index + 1]?.blindNumber ?? null,
  };
}

// Ogiltigt blindnummer och vin som saknas ger båda "hittades inte".
export async function getParticipantWine(
  rawBlindNumber: string,
): Promise<ParticipantWineDetail> {
  const participant = await requireParticipant();
  const blindNumber = blindNumberSchema.safeParse(rawBlindNumber);
  if (!blindNumber.success) notFound();

  const [wine, ratings] = await Promise.all([
    findWineForParticipant(participant, blindNumber.data),
    listOwnRatings(participant),
  ]);
  if (!wine) notFound();

  const rating = ratings.find((r) => r.wineId === wine.id);
  return {
    blindNumber: wine.blindNumber,
    isOpen: wine.isOpen,
    type: wine.type,
    rating: rating
      ? {
          score: rating.score,
          note: rating.note,
          tags: rating.tags,
          guess: rating.guess,
          sweetness: rating.sweetness,
          body: rating.body,
          astringency: rating.astringency,
          acidity: rating.acidity,
        }
      : null,
    previousBlindNumber: wine.previousBlindNumber,
    nextBlindNumber: wine.nextBlindNumber,
  };
}
