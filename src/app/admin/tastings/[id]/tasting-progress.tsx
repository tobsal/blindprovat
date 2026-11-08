"use client";

import { unstable_rethrow } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { getTastingProgressAction } from "@/api/admin-tasting-actions";
import type { TastingProgress } from "@/api/admin-tastings";

// Samma takt som deltagarsidorna (princip 8).
const POLL_INTERVAL_MS = 4000;

type Problem = "offline" | "server" | null;

const ProgressContext = createContext<{
  progress: TastingProgress;
  problem: Problem;
}>({ progress: { participantCount: 0, ratingCounts: [] }, problem: null });

// Pollar bara antalet deltagare och betyg, i stället för att rendera om sidan
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

// Antalet annonseras inte vid varje ändring, det skulle bli för pratigt.
// Bara problem med uppdateringen annonseras.
export function ParticipantCount() {
  const { progress, problem } = useContext(ProgressContext);
  const { participantCount } = progress;
  return (
    <>
      <p className="mt-2">
        {participantCount === 0
          ? "Ingen deltagare har gått med än."
          : `${participantCount} deltagare har gått med.`}
      </p>
      <p role="status" className="text-sm text-on-surface-variant">
        {problem && problemMessages[problem]}
      </p>
    </>
  );
}

export function WineRatingCount({ wineId }: { wineId: string }) {
  const { progress } = useContext(ProgressContext);
  if (progress.participantCount === 0) return null;
  const ratingCount =
    progress.ratingCounts.find((row) => row.wineId === wineId)?.ratingCount ??
    0;
  return (
    <p className="mt-1 text-sm">
      {ratingCount} av {progress.participantCount} har betygsatt
    </p>
  );
}
