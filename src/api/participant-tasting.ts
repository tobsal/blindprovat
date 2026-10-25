import { notFound } from "next/navigation";
import { findTastingForParticipant } from "@/repositories/tastings";
import { requireParticipant } from "./participant-session";

export type ParticipantView = {
  displayName: string;
  tastingName: string;
};

// Provningen slås upp via sessionen, aldrig via ett id utifrån.
export async function getParticipantView(): Promise<ParticipantView> {
  const participant = await requireParticipant();
  const tasting = await findTastingForParticipant(participant);
  if (!tasting) notFound();
  return { displayName: participant.displayName, tastingName: tasting.name };
}
