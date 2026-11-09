"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useEffect, useState } from "react";
import { getWineOpenAction } from "@/api/participant-actions";
import { POLL_INTERVAL_MS } from "@/domain/tasting";
import { useIsOnline } from "../../poll-refresh";
import { WineStateIcon } from "../../wine-state-icon";
import { RatingForm } from "./rating-form";

type Props = Omit<React.ComponentProps<typeof RatingForm>, "isOpen"> & {
  initialIsOpen: boolean;
};

// Vinsidan pollar bara om vinet är öppet, i stället för att rendera om hela
// sidan med router.refresh(). Ett fel vid pollingen kan då inte ersätta
// formuläret med felsidan eller ladda om sidan, så det som skrivits finns
// kvar (princip 13 och 14). Det senast kända värdet gäller tills nästa
// lyckade läsning.
function usePolledWineOpen(blindNumber: number, initialIsOpen: boolean) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [failed, setFailed] = useState(false);
  const isOnline = useIsOnline();

  useEffect(() => {
    if (!isOnline) return;
    let active = true;
    let inFlight = false;
    const timer = setInterval(async () => {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const status = await getWineOpenAction(String(blindNumber));
        if (!active) return;
        setFailed(false);
        if (status) setIsOpen(status.isOpen);
      } catch (error) {
        // Sessionen kan ha upphört, och då skickas deltagaren vidare.
        unstable_rethrow(error);
        if (active) setFailed(true);
      } finally {
        inFlight = false;
      }
    }, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [blindNumber, isOnline]);

  const problem = !isOnline
    ? "Ingen uppkoppling. Vinets status uppdateras när du är uppkopplad igen."
    : failed
      ? "Kunde inte hämta vinets status. Försöker igen …"
      : null;
  return { isOpen, problem };
}

export function LiveWineRating({ initialIsOpen, ...formProps }: Props) {
  const { blindNumber } = formProps;
  const { isOpen, problem } = usePolledWineOpen(blindNumber, initialIsOpen);

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href="/tasting"
          aria-label="Tillbaka till alla viner"
          className="-ml-2 flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-surface-high active:bg-surface-highest"
        >
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
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-2xl font-semibold">Vin {blindNumber}</h1>
        {/* Öppet läge har både fyllnadsfärg och pennikonen från översikten,
            så att skillnaden syns även utan färg (princip 13). */}
        {isOpen ? (
          <span className="flex items-center gap-1.5 rounded-lg bg-primary py-1 pr-3 pl-2 text-sm font-medium text-on-primary">
            <WineStateIcon state="open" />
            Öppet för betyg
          </span>
        ) : (
          <span className="rounded-lg bg-surface-high px-3 py-1 text-sm font-medium">
            Stängt
          </span>
        )}
      </div>

      <p role="status" className="mt-2 text-sm text-on-surface-variant">
        {problem}
      </p>

      <div className="mt-2">
        <RatingForm {...formProps} isOpen={isOpen} />
      </div>
    </>
  );
}
