import type { ParticipantWineState } from "@/domain/participant-wine";

const paths: Record<ParticipantWineState, React.ReactNode> = {
  // Bock: betygsatt.
  rated: <path d="M20 6 9 17l-5-5" />,
  open_rated: <path d="M20 6 9 17l-5-5" />,
  // Penna: öppet för betyg.
  open: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  // Klocka: väntar.
  waiting: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

// Ikonen kompletterar statustexten och är dekoration.
export function WineStateIcon({ state }: { state: ParticipantWineState }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {paths[state]}
    </svg>
  );
}
