import { getParticipant } from "@/api/participant-session";

// Layoutens vakt skickar den som saknar session vidare, så här räcker det att
// inte visa något.
export async function ParticipantName() {
  const participant = await getParticipant();
  if (!participant) return null;

  return <p>Du är med som {participant.displayName}</p>;
}
