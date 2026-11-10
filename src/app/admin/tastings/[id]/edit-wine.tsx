"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FormError } from "@/app/_components/form-error";
import { keepInputOnFailure } from "@/app/_components/keep-input-on-failure";
import { useToast } from "@/app/_components/toast";
import { updateWineAction, type WineField } from "@/api/admin-tasting-actions";
import type { AdminWine } from "@/api/admin-tastings";
import type { FormState } from "@/api/form-state";
import {
  firstInvalidWineField,
  WineFields,
  wineFieldOrder,
  type WineInputs,
} from "./wine-fields";

const initialState: FormState<WineField> = {};

function formValuesFor(wine: AdminWine): Partial<Record<WineField, string>> {
  return {
    name: wine.name,
    type: wine.type ?? undefined,
    producer: wine.producer ?? "",
    grape: wine.grape ?? "",
    region: wine.region ?? "",
    country: wine.country ?? "",
    vintage: wine.vintage?.toString() ?? "",
    price: wine.price?.toString() ?? "",
    articleNumber: wine.articleNumber ?? "",
  };
}

// Knappen fäller ut ett ifyllt formulär. Formuläret monteras bara när det
// är öppet, så att det alltid börjar från vinets sparade uppgifter. Kvittot
// visas som en toast och finns kvar när formuläret fälls ihop. Övriga
// knappar för vinet (children) ligger på samma rad som Ändra, så att
// formuläret fälls ut under hela raden. De döljs medan formuläret är öppet,
// så att vinet inte kan tas bort mitt i en ändring och fokus går direkt
// från Ändra till formuläret.
export function EditWine({
  wine,
  children,
}: {
  wine: AdminWine;
  children?: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const formId = `edit-wine-${wine.id}`;

  function close() {
    setIsOpen(false);
    toggle.current?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row flex-wrap gap-2">
        <button
          ref={toggle}
          type="button"
          aria-expanded={isOpen}
          aria-controls={isOpen ? formId : undefined}
          onClick={() => setIsOpen(!isOpen)}
          className="btn-secondary"
        >
          Ändra Vin {wine.blindNumber}
        </button>
        {!isOpen && children}
      </div>
      {isOpen && <EditWineForm id={formId} wine={wine} onClose={close} />}
    </div>
  );
}

function EditWineForm({
  id,
  wine,
  onClose,
}: {
  id: string;
  wine: AdminWine;
  onClose: () => void;
}) {
  const showToast = useToast();
  const [state, formAction, isPending] = useActionState(
    keepInputOnFailure(async (previous, formData) => {
      const result = await updateWineAction(wine.id, previous, formData);
      if (result.message) {
        showToast(result.message);
        onClose();
      }
      return result;
    }, wineFieldOrder),
    initialState,
  );
  const inputs = useRef<WineInputs>({});
  const hasFieldErrors = Object.keys(state.fieldErrors ?? {}).length > 0;
  const headingId = `${id}-heading`;

  // Namnfältet får fokus när formuläret öppnas, och vid fel det första
  // felaktiga fältet.
  useEffect(() => {
    const firstInvalid = firstInvalidWineField(state);
    inputs.current[firstInvalid ?? "name"]?.focus();
  }, [state]);

  return (
    <form
      id={id}
      action={formAction}
      noValidate
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isPending) onClose();
      }}
      className="flex flex-col gap-4 rounded-2xl border border-outline-variant p-4"
    >
      <h3 id={headingId} className="font-semibold">
        Ändra Vin {wine.blindNumber}
      </h3>
      {state.formError && <FormError>{state.formError}</FormError>}
      {hasFieldErrors && <FormError>Rätta de markerade fälten.</FormError>}
      <WineFields
        idPrefix={id}
        values={state.values ?? formValuesFor(wine)}
        fieldErrors={state.fieldErrors}
        inputs={inputs}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary disabled:opacity-70"
        >
          {isPending ? "Sparar …" : "Spara"}
        </button>
        <button
          type="button"
          onClick={() => onClose()}
          disabled={isPending}
          className="btn-secondary"
        >
          Avbryt
        </button>
      </div>
    </form>
  );
}
