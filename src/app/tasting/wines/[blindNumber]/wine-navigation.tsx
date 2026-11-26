"use client";

import Link from "next/link";
import { useId } from "react";

type Props = {
  previousBlindNumber: number | null;
  nextBlindNumber: number | null;
  hasUnsavedChanges: boolean;
};

// Knapparna för att byta vin. Finns det osparade ändringar står det ovanför
// dem, i stället för en fråga med confirm() som är besvärlig på mobil.
export function WineNavigation({
  previousBlindNumber,
  nextBlindNumber,
  hasUnsavedChanges,
}: Props) {
  // Förra vinets sida kan ligga kvar dold i DOM:en, så id:t måste vara unikt.
  const warningId = useId();
  const describedBy = hasUnsavedChanges ? warningId : undefined;

  return (
    <nav aria-label="Byt vin" className="mt-8 flex flex-col gap-3">
      {hasUnsavedChanges && (
        <p id={warningId} className="text-sm font-medium">
          Spara betyget innan du byter vin, annars kan ändringarna försvinna.
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-3">
        {previousBlindNumber !== null ? (
          <Link
            href={`/tasting/wines/${previousBlindNumber}`}
            aria-describedby={describedBy}
            className="btn-secondary"
          >
            Föregående vin
          </Link>
        ) : (
          <span />
        )}
        {nextBlindNumber !== null && (
          <Link
            href={`/tasting/wines/${nextBlindNumber}`}
            aria-describedby={describedBy}
            className="btn-secondary"
          >
            Nästa vin
          </Link>
        )}
      </div>
    </nav>
  );
}
