"use client";

import { unstable_rethrow } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { getTastingProgressAction } from "@/api/admin-tasting-actions";
import type { TastingProgress } from "@/api/admin-tastings";
import { POLL_INTERVAL_MS } from "@/domain/tasting";

type Problem = "offline" | "server" | null;

const ProgressContext = createContext<{
  progress: TastingProgress;
  problem: Problem;
}>({ progress: { participants: [], ratingCounts: [] }, problem: null });

// Pollar bara deltagarna och antalet betyg, i stället för att rendera om sidan
// med router.refresh(). Ett fel vid pollingen kan då inte ladda om sidan och
// ta bort det som skrivits i vinformulären. Det senast kända värdet gäller
// tills nästa lyckade läsning.
export function TastingProgressProvider({
  tastingId,
  initial,
  poll,
  children,
}: {
  tastingId: string;
  initial: TastingProgress;
  poll: boolean;
  children: React.ReactNode;
}) {
  const [progress, setProgress] = useState(initial);
  const [problem, setProblem] = useState<Problem>(null);

  useEffect(() => {
    if (!poll) return;
    let active = true;
    let inFlight = false;
    const timer = setInterval(async () => {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const next = await getTastingProgressAction(tastingId);
        if (!active) return;
        setProblem(null);
        if (next) setProgress(next);
      } catch (error) {
        // Sessionen kan ha gått ut, och då skickas admin till inloggningen.
        unstable_rethrow(error);
        if (active)
          setProblem(error instanceof TypeError ? "offline" : "server");
      } finally {
        inFlight = false;
      }
    }, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [tastingId, poll]);

  return (
    <ProgressContext value={{ progress, problem }}>{children}</ProgressContext>
  );
}

const problemMessages: Record<Exclude<Problem, null>, string> = {
  offline: "Ingen uppkoppling. Antalen uppdateras när du är uppkopplad igen.",
  server: "Kunde inte uppdatera antalen. Försöker igen …",
};

// Ändringar i listan annonseras inte, det skulle bli för pratigt. Bara
// problem med uppdateringen annonseras. Antalet betygsatta viner visas bara när
// viner kan betygsättas.
export function Participants({
  wineCount,
  showRatingCounts,
}: {
  wineCount: number;
  showRatingCounts: boolean;
}) {
  const { progress, problem } = useContext(ProgressContext);
  const { participants } = progress;
  return (
    <>
      <p className="mt-2">
        {participants.length === 0
          ? "Ingen deltagare har gått med än."
          : `${participants.length} deltagare har gått med.`}
      </p>
      {participants.length > 0 && (
        <ul className="mt-2 divide-y divide-outline-variant overflow-hidden rounded-2xl bg-surface-low">
          {participants.map((participant) => (
            <li
              key={participant.id}
              className="flex flex-wrap justify-between gap-x-4 px-4 py-3"
            >
              <span className="font-medium">{participant.displayName}</span>
              {showRatingCounts && (
                <span className="text-sm">
                  {participant.ratingCount} av {wineCount} viner betygsatta
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="text-sm text-on-surface-variant">
        {problem && problemMessages[problem]}
      </p>
    </>
  );
}

export function WineRatingCount({ wineId }: { wineId: string }) {
  const { progress } = useContext(ProgressContext);
  const participantCount = progress.participants.length;
  if (participantCount === 0) return null;
  const ratingCount =
    progress.ratingCounts.find((row) => row.wineId === wineId)?.ratingCount ??
    0;
  return (
    <p className="mt-1 text-sm">
      {ratingCount} av {participantCount} har betygsatt
    </p>
  );
}
