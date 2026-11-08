"use client";

import { useActionState, useRef } from "react";
import { FormError } from "@/app/_components/form-error";
import { keepInputOnFailure } from "@/app/_components/keep-input-on-failure";
import {
  deleteTastingAction,
  type StatusFormState,
} from "@/api/admin-tasting-actions";
import type { TastingStatus } from "@/domain/tasting";

const initialState: StatusFormState = {};

// Inbyggd modal dialog (showModal): fokus stannar i dialogen, Esc stänger
// den och webbläsaren lämnar tillbaka fokus till knappen som öppnade den.
export function DeleteTastingButton({
  tastingId,
  status,
}: {
  tastingId: string;
  status: TastingStatus;
}) {
  const [state, formAction, isDeleting] = useActionState(
    keepInputOnFailure(deleteTastingAction.bind(null, tastingId), []),
    initialState,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  function openDialog() {
    dialog.current?.showModal();
    // Avbryt får fokus först, så att Enter inte tar bort av misstag.
    cancelButton.current?.focus();
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="btn-secondary self-start"
      >
        Ta bort provningen
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="delete-tasting-heading"
        aria-describedby="delete-tasting-description"
        onCancel={(event) => {
          // Esc ska inte stänga dialogen medan borttagningen pågår.
          if (isDeleting) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface p-6 text-on-surface backdrop:bg-black/60"
      >
        <form action={formAction} className="flex flex-col gap-4">
          <h2 id="delete-tasting-heading" className="text-lg font-semibold">
            Ta bort provningen?
          </h2>
          <p id="delete-tasting-description">
            Provningen och alla viner, deltagare och betyg tas bort. Det går
            inte att ångra.
            {status === "live" &&
              " Provningen pågår, och deltagarna förlorar åtkomsten direkt."}
          </p>
          {state.formError && <FormError>{state.formError}</FormError>}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isDeleting}
              className="btn-primary disabled:opacity-70"
            >
              {isDeleting ? "Tar bort …" : "Ja, ta bort"}
            </button>
            <button
              ref={cancelButton}
              type="button"
              onClick={() => dialog.current?.close()}
              disabled={isDeleting}
              className="btn-secondary"
            >
              Avbryt
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
