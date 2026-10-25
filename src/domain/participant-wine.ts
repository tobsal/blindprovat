// Vad en deltagare ser om ett vin. Datamodellen sparar inte om ett vin har
// varit öppet, så ett stängt vin utan betyg kan inte skiljas från ett som
// inte har öppnats än.
export type ParticipantWineState =
  | "open"
  | "open_rated"
  | "rated"
  | "waiting";

export function participantWineState(
  isOpen: boolean,
  hasRating: boolean,
): ParticipantWineState {
  if (isOpen) return hasRating ? "open_rated" : "open";
  return hasRating ? "rated" : "waiting";
}
