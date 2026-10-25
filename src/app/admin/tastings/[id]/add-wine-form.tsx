"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormError } from "@/app/_components/form-error";
import { keepInputWhenOffline } from "@/app/_components/keep-input-when-offline";
import { TextField } from "@/app/_components/text-field";
import {
  addWineAction,
  type WineField,
} from "@/api/admin-tasting-actions";
import type { FormState } from "@/api/form-state";

const initialState: FormState<WineField> = {};

// Ordningen är den som fälten visas i, och styr vilket fält som får fokus
// först när flera är felaktiga.
const fields: {
  field: WineField;
  label: string;
  hint?: string;
  inputMode?: "numeric";
}[] = [
  { field: "name", label: "Namn" },
  { field: "producer", label: "Producent (valfritt)" },
  { field: "grape", label: "Druva (valfritt)" },
  { field: "region", label: "Region (valfritt)" },
  { field: "country", label: "Land (valfritt)" },
  {
    field: "vintage",
    label: "Årgång (valfritt)",
    hint: "Lämna tomt om vinet är årgångslöst.",
    inputMode: "numeric",
  },
  { field: "price", label: "Pris i kronor (valfritt)", inputMode: "numeric" },
];

export function AddWineForm({ tastingId }: { tastingId: string }) {
  const [state, formAction, isPending] = useActionState(
    keepInputWhenOffline(
      addWineAction.bind(null, tastingId),
      fields.map(({ field }) => field),
    ),
    initialState,
  );
  const inputs = useRef<Partial<Record<WineField, HTMLInputElement | null>>>(
    {},
  );
  const hasFieldErrors = Object.keys(state.fieldErrors ?? {}).length > 0;

  // Vid fel hamnar fokus på första felaktiga fältet, efter ett tillagt vin
  // på namnfältet så att nästa vin kan skrivas in direkt.
  useEffect(() => {
    if (state === initialState) return;
    const firstInvalid = fields.find(({ field }) => state.fieldErrors?.[field]);
    const target = firstInvalid
      ? inputs.current[firstInvalid.field]
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
      {fields.map(({ field, label, hint, inputMode }) => (
        <TextField
          key={field}
          ref={(input) => {
            inputs.current[field] = input;
          }}
          id={`wine-${field}`}
          name={field}
          label={label}
          hint={hint}
          inputMode={inputMode}
          defaultValue={state.values?.[field]}
          error={state.fieldErrors?.[field]?.[0]}
        />
      ))}
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
