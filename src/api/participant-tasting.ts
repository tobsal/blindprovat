import { notFound } from "next/navigation";
import {
  participantWineState,
  type ParticipantWineState,
} from "@/domain/participant-wine";
import type { TastingStatus } from "@/domain/tasting";
import { isParticipantTastingCode } from "@/repositories/participants";
import {
  listOwnRatings,
  listResultInputsForParticipant,
} from "@/repositories/ratings";
import { findTastingForParticipant } from "@/repositories/tastings";
import { listWinesForParticipant } from "@/repositories/wines";
import { getParticipant, requireParticipant } from "./participant-session";
import { buildResultsView, type ResultsView } from "./tasting-results";

// Bara det deltagaren får se: blindnumret, tillståndet och det egna betyget.
// Vininformation tas inte med, inte heller efter avslöjandet.
export type ParticipantWineView = {
  blindNumber: number;
  state: ParticipantWineState;
  score: number | null;
};

export type ParticipantView = {
  tastingName: string;
  status: TastingStatus;
  wines: ParticipantWineView[];
  // null tills provningen är avslöjad. Då finns vinernas uppgifter, gruppens
  // resultat och smeknamnen, men inte vem som gav vilket betyg.
  results: ResultsView | null;
};

// Namnet på provningen som sessionen gäller, eller null utan session. För
// startsidan, som också visas för den som inte är med i någon provning och
// därför inte får skicka vidare.
export async function getActiveTastingName(): Promise<string | null> {
  const participant = await getParticipant();
  if (!participant) return null;
  const tasting = await findTastingForParticipant(participant);
  return tasting?.name ?? null;
}

// Om sessionen redan gäller provningen med koden. Utan session blir svaret
// nej. För startsidan när den öppnas via en deltagarlänk.
export async function hasJoinedTasting(code: string): Promise<boolean> {
  const participant = await getParticipant();
  return participant ? isParticipantTastingCode(participant, code) : false;
}

// Provningen slås upp via sessionen, aldrig via ett id utifrån. Den här
// läsningen är också det som sidan hämtar på nytt vid polling.
export async function getParticipantView(): Promise<ParticipantView> {
  const participant = await requireParticipant();
  const [tasting, wines, ratings, resultInputs] = await Promise.all([
    findTastingForParticipant(participant),
    listWinesForParticipant(participant),
    listOwnRatings(participant),
    listResultInputsForParticipant(participant),
  ]);
  if (!tasting) notFound();

  const scoreByWine = new Map(ratings.map((r) => [r.wineId, r.score]));
  const winesWithDetails = wines.flatMap(({ id, blindNumber, details }) =>
    details ? [{ id, blindNumber, details }] : [],
  );
  // Vinerna och resultatet läses i separata frågor. Avslöjas provningen emellan
  // kan det ena svaret vara avslöjat och det andra inte. Resultatet visas därför
  // bara om alla vinerna har uppgifter, annars väntar vi till nästa polling.
  const results =
    resultInputs && winesWithDetails.length === wines.length
      ? buildResultsView({
          wines: winesWithDetails,
          participants: resultInputs.participants,
          ratings: resultInputs.ratings,
          ownParticipantId: participant.id,
        })
      : null;
  return {
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
    results,
  };
}
