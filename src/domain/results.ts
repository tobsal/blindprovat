export type ScoredRating = {
  wineId: string;
  participantId: string;
  score: number;
};

export type WineScoreSummary = {
  average: number;
  lowest: number;
  highest: number;
  count: number;
};

export type WineRating = WineScoreSummary & { rank: number };

export type WineResult = {
  wineId: string;
  // null när vinet saknar betyg.
  rating: WineRating | null;
};

export type ParticipantResult = {
  participantId: string;
  rank: number;
  // Lägre värde betyder närmare gruppen.
  meanDeviation: number;
  comparedWineCount: number;
};

export type TastingResults = {
  wines: WineResult[];
  participants: ParticipantResult[];
};

// Med bara ett betyg skulle deltagaren jämföras med sig själv.
const MIN_RATINGS_FOR_COMPARISON = 2;

// Snitt räknas i flyttal, så lika värden kan skilja sig i sista decimalen.
const TIE_TOLERANCE = 1e-9;

function summarizeScores(scores: readonly number[]): WineScoreSummary | null {
  if (scores.length === 0) return null;
  return {
    average: mean(scores),
    lowest: Math.min(...scores),
    highest: Math.max(...scores),
    count: scores.length,
  };
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Lika värden delar plats och nästa plats hoppas över (1, 1, 3).
// Förutsätter att värdena redan är sorterade.
function competitionRanks(sortedValues: readonly number[]): number[] {
  const ranks: number[] = [];
  sortedValues.forEach((value, index) => {
    const tiesPrevious =
      index > 0 &&
      Math.abs(value - sortedValues[index - 1]) < TIE_TOLERANCE;
    ranks.push(tiesPrevious ? ranks[index - 1] : index + 1);
  });
  return ranks;
}

// Betyg på viner som inte finns i wineIds ignoreras.
function groupScoresByWine(
  wineIds: readonly string[],
  ratings: readonly ScoredRating[],
): Map<string, number[]> {
  const scoresByWine = new Map(wineIds.map((wineId) => [wineId, [] as number[]]));
  for (const rating of ratings) {
    scoresByWine.get(rating.wineId)?.push(rating.score);
  }
  return scoresByWine;
}

// Betygsatta viner kommer först, rankade efter snitt. Viner utan betyg kommer
// sist, i den ordning de skickades in.
function rankWines(
  wineIds: readonly string[],
  scoresByWine: ReadonlyMap<string, readonly number[]>,
): WineResult[] {
  const rated: { wineId: string; summary: WineScoreSummary }[] = [];
  const unrated: WineResult[] = [];
  for (const wineId of wineIds) {
    const summary = summarizeScores(scoresByWine.get(wineId) ?? []);
    if (summary) rated.push({ wineId, summary });
    else unrated.push({ wineId, rating: null });
  }
  // Stabil sortering behåller blindnummerordningen vid lika snitt.
  rated.sort((a, b) => b.summary.average - a.summary.average);
  const ranks = competitionRanks(rated.map(({ summary }) => summary.average));

  return [
    ...rated.map(
      ({ wineId, summary }, index): WineResult => ({
        wineId,
        rating: { ...summary, rank: ranks[index] },
      }),
    ),
    ...unrated,
  ];
}

function rankParticipantsByCloseness(
  ratings: readonly ScoredRating[],
  wines: readonly WineResult[],
): ParticipantResult[] {
  const comparableAverages = new Map(
    wines.flatMap(({ wineId, rating }) =>
      rating && rating.count >= MIN_RATINGS_FOR_COMPARISON
        ? [[wineId, rating.average] as const]
        : [],
    ),
  );

  const deviationsByParticipant = new Map<string, number[]>();
  for (const rating of ratings) {
    const average = comparableAverages.get(rating.wineId);
    if (average === undefined) continue;
    const deviations = deviationsByParticipant.get(rating.participantId) ?? [];
    deviations.push(Math.abs(rating.score - average));
    deviationsByParticipant.set(rating.participantId, deviations);
  }

  const participants = [...deviationsByParticipant]
    .map(([participantId, deviations]) => ({
      participantId,
      meanDeviation: mean(deviations),
      comparedWineCount: deviations.length,
    }))
    .sort((a, b) => a.meanDeviation - b.meanDeviation);
  const ranks = competitionRanks(
    participants.map((participant) => participant.meanDeviation),
  );
  return participants.map((participant, index) => ({
    ...participant,
    rank: ranks[index],
  }));
}

export function calculateResults(
  wineIds: readonly string[],
  ratings: readonly ScoredRating[],
): TastingResults {
  const wines = rankWines(wineIds, groupScoresByWine(wineIds, ratings));
  return { wines, participants: rankParticipantsByCloseness(ratings, wines) };
}
