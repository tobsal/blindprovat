"use client";

import { useActionState, useRef } from "react";
import { FormError } from "@/app/_components/form-error";
import { keepInputOnFailure } from "@/app/_components/keep-input-on-failure";
import {
  deleteWineAction,
  type StatusFormState,
} from "@/api/admin-tasting-actions";
import { useToast } from "@/app/_components/toast";

const initialState: StatusFormState = {};

// Samma inbyggda modala dialog som när provningen tas bort. Lyckas det
// försvinner raden med knappen, så kvittot visas som en toast och fokus
// flyttas till rubriken "Viner" (wines-heading i page.tsx), så att det inte
// hamnar på sidans början.
export function DeleteWineButton({
  wineId,
  blindNumber,
}: {
  wineId: string;
  blindNumber: number;
}) {
  const showToast = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const dialogId = `delete-wine-${wineId}`;
  const headingId = `${dialogId}-heading`;
  const descriptionId = `${dialogId}-description`;
  const [state, formAction, isDeleting] = useActionState(
    keepInputOnFailure(async () => {
      const result = await deleteWineAction(wineId);
      if (result.message) {
        // Dialogen stängs innan fokus flyttas till rubriken, annars hindrar
        // den modala dialogen fokusflytten. Elementen slås upp via id,
        // eftersom en ref inte får läsas i en funktion som skapas under
        // renderingen.
        const element = document.getElementById(dialogId);
        if (element instanceof HTMLDialogElement) element.close();
        document.getElementById("wines-heading")?.focus();
        showToast(result.message);
      }
      return result;
    }, []),
    initialState,
  );

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
        Ta bort Vin {blindNumber}
      </button>

      <dialog
        ref={dialog}
        id={dialogId}
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          // Esc ska inte stänga dialogen medan borttagningen pågår.
          if (isDeleting) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface p-6 text-on-surface backdrop:bg-black/60"
      >
        <form action={formAction} className="flex flex-col gap-4">
          <h2 id={headingId} className="text-lg font-semibold">
            Ta bort Vin {blindNumber}?
          </h2>
          <p id={descriptionId}>
            Vinet tas bort och vinerna efter får nya nummer. Det går inte att
            ångra.
          </p>
          {state.formError && <FormError>{state.formError}</FormError>}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isDeleting}
              className="btn-danger disabled:opacity-70"
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
