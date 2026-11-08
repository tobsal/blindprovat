"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormError } from "@/app/_components/form-error";
import { keepInputWhenOffline } from "@/app/_components/keep-input-when-offline";
import { addWineAction, type WineField } from "@/api/admin-tasting-actions";
import type { FormState } from "@/api/form-state";
import {
  firstInvalidWineField,
  WineFields,
  wineFieldOrder,
  type WineInputs,
} from "./wine-fields";

const initialState: FormState<WineField> = {};

export function AddWineForm({ tastingId }: { tastingId: string }) {
  const [state, formAction, isPending] = useActionState(
    keepInputWhenOffline(addWineAction.bind(null, tastingId), wineFieldOrder),
    initialState,
  );
  const inputs = useRef<WineInputs>({});
  const hasFieldErrors = Object.keys(state.fieldErrors ?? {}).length > 0;

  // Vid fel hamnar fokus på första felaktiga fältet, efter ett tillagt vin
  // på namnfältet så att nästa vin kan skrivas in direkt.
  useEffect(() => {
    if (state === initialState) return;
    const firstInvalid = firstInvalidWineField(state);
    const target = firstInvalid
      ? inputs.current[firstInvalid]
      : state.message
        ? inputs.current.name
        : null;
    target?.focus();
  }, [state]);

  return (
    <form
      action={formAction}
      noValidate
      aria-labelledby="add-wine-heading"
      className="mt-4 flex flex-col gap-4"
    >
      <h3 id="add-wine-heading" className="font-semibold">
        Lägg till vin
      </h3>
      {state.formError && <FormError>{state.formError}</FormError>}
      {hasFieldErrors && <FormError>Rätta de markerade fälten.</FormError>}
      <WineFields
        idPrefix="wine"
        values={state.values}
        fieldErrors={state.fieldErrors}
        inputs={inputs}
      />
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary self-start disabled:opacity-70"
      >
        {isPending ? "Lägger till …" : "Lägg till vin"}
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
