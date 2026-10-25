import { notFound } from "next/navigation";
import {
  participantWineState,
  type ParticipantWineState,
} from "@/domain/participant-wine";
import type { TastingStatus } from "@/domain/tasting";
import { listOwnRatings } from "@/repositories/ratings";
import { findTastingForParticipant } from "@/repositories/tastings";
import { listWinesForParticipant } from "@/repositories/wines";
import { requireParticipant } from "./participant-session";

// Bara det deltagaren får se: blindnumret, tillståndet och det egna betyget.
// Vininformation tas inte med, inte heller efter avslöjandet.
export type ParticipantWineView = {
  blindNumber: number;
  state: ParticipantWineState;
  score: number | null;
};

export type ParticipantView = {
  displayName: string;
  tastingName: string;
  status: TastingStatus;
  wines: ParticipantWineView[];
};

// Provningen slås upp via sessionen, aldrig via ett id utifrån. Den här
// läsningen är också det som sidan hämtar på nytt vid polling.
export async function getParticipantView(): Promise<ParticipantView> {
  const participant = await requireParticipant();
  const [tasting, wines, ratings] = await Promise.all([
    findTastingForParticipant(participant),
    listWinesForParticipant(participant),
    listOwnRatings(participant),
  ]);
  if (!tasting) notFound();

  const scoreByWine = new Map(ratings.map((r) => [r.wineId, r.score]));
  return {
    displayName: participant.displayName,
    tastingName: tasting.name,
    status: tasting.status,
    wines: wines.map((wine) => {
      const score = scoreByWine.get(wine.id) ?? null;
      return {
        blindNumber: wine.blindNumber,
        state: participantWineState(wine.isOpen, score !== null),
        score,
      };
    }),
  };
}
