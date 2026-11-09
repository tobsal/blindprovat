"use client";

import { useActionState } from "react";
import { FormError } from "@/app/_components/form-error";
import { keepInputOnFailure } from "@/app/_components/keep-input-on-failure";
import {
  setWineOpenAction,
  type StatusFormState,
} from "@/api/admin-tasting-actions";

const initialState: StatusFormState = {};

function buttonLabel(isOpen: boolean, isPending: boolean, blindNumber: number) {
  if (isPending) {
    return isOpen
      ? `Stänger Vin ${blindNumber} …`
      : `Öppnar Vin ${blindNumber} …`;
  }
  return isOpen ? `Stäng Vin ${blindNumber}` : `Öppna Vin ${blindNumber}`;
}

// Knappen ligger kvar efter bytet och behåller därför fokus. Bara texten
// ändras, och kvittot annonseras i statusraden.
export function WineOpenToggle({
  wineId,
  blindNumber,
  isOpen,
}: {
  wineId: string;
  blindNumber: number;
  isOpen: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    keepInputOnFailure(() => setWineOpenAction(wineId, !isOpen), []),
    initialState,
  );

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <p>
        <span className="sr-only">Vin {blindNumber}: </span>
        {isOpen ? "Öppet för betyg" : "Stängt"}
      </p>
      {state.formError && <FormError>{state.formError}</FormError>}
      {/* Inte disabled medan anropet pågår: då tappar knappen fokus. Ett
          extra klick skickar samma värde igen och gör ingen skada. */}
      <button
        type="submit"
        aria-busy={isPending}
        className={`${isOpen ? "btn-secondary" : "btn-primary"} self-start`}
      >
        {buttonLabel(isOpen, isPending, blindNumber)}
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
