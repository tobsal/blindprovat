import {
  averageTasteClocksByWine,
  calculateResults,
  type ClockRating,
  type ScoredRating,
  type TasteClockAverages,
  type WineRating,
} from "@/domain/results";
import type { ParticipantName } from "@/repositories/participants";
import type { WineDetails } from "@/repositories/wines";

export type ResultsWine = {
  blindNumber: number;
  details: WineDetails;
  // null när vinet saknar betyg.
  rating: WineRating | null;
  // Den som tittar på resultatet. Alltid null för admin.
  ownScore: number | null;
  tasteClocks: TasteClockAverages;
};

export type ResultsParticipant = {
  displayName: string;
  // null när deltagaren inte gick att jämföra med gruppen.
  rank: number | null;
  meanDeviation: number | null;
  comparedWineCount: number;
  isSelf: boolean;
};

// Bara det som får visas: vinernas uppgifter och sammanställning samt
// deltagarnas smeknamn. Vem som gav vilket betyg lämnar aldrig den här vyn.
export type ResultsView = {
  wines: ResultsWine[];
  participants: ResultsParticipant[];
};

type ResultsWineInput = {
  id: string;
  blindNumber: number;
  details: WineDetails;
};

export function buildResultsView({
  wines,
  participants,
  ratings,
  ownParticipantId,
}: {
  wines: readonly ResultsWineInput[];
  participants: readonly ParticipantName[];
  ratings: readonly (ScoredRating & ClockRating)[];
  ownParticipantId?: string;
}): ResultsView {
  const wineIds = wines.map((wine) => wine.id);
  const results = calculateResults(wineIds, ratings);
  const tasteClocksByWine = averageTasteClocksByWine(wineIds, ratings);
  const winesById = new Map(wines.map((wine) => [wine.id, wine]));
  const ownScoreByWine = new Map(
    ratings
      .filter((rating) => rating.participantId === ownParticipantId)
      .map((rating) => [rating.wineId, rating.score]),
  );

  const resultWines = results.wines.flatMap(({ wineId, rating }) => {
    const wine = winesById.get(wineId);
    const tasteClocks = tasteClocksByWine.get(wineId);
    if (!wine || !tasteClocks) return [];
    return [
      {
        blindNumber: wine.blindNumber,
        details: wine.details,
        rating,
        ownScore: ownScoreByWine.get(wineId) ?? null,
        tasteClocks,
      },
    ];
  });

  const namesById = new Map(
    participants.map((participant) => [
      participant.id,
      participant.displayName,
    ]),
  );
  const compared = results.participants.flatMap(
    (result): ResultsParticipant[] => {
      const displayName = namesById.get(result.participantId);
      if (displayName === undefined) return [];
      return [
        {
          displayName,
          rank: result.rank,
          meanDeviation: result.meanDeviation,
          comparedWineCount: result.comparedWineCount,
          isSelf: result.participantId === ownParticipantId,
        },
      ];
    },
  );
  const comparedIds = new Set(
    results.participants.map((result) => result.participantId),
  );
  // Alla som var med syns, också de som inte gick att jämföra.
  const notCompared = participants
    .filter((participant) => !comparedIds.has(participant.id))
    .map((participant): ResultsParticipant => ({
      displayName: participant.displayName,
      rank: null,
      meanDeviation: null,
      comparedWineCount: 0,
      isSelf: participant.id === ownParticipantId,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "sv"));

  return {
    wines: resultWines,
    participants: [...compared, ...notCompared],
  };
}
