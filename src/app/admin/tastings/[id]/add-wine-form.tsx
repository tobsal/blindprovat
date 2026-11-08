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
import { WINE_TYPES, type WineType } from "@/domain/wine";

const initialState: FormState<WineField> = {};

const wineTypeLabels: Record<WineType, string> = {
  red: "Rött",
  white: "Vitt",
  rose: "Rosé",
  sparkling: "Mousserande",
};

type TextFieldSpec = {
  field: Exclude<WineField, "type">;
  label: string;
  hint?: string;
  inputMode?: "numeric";
};

// Vintypen visas mellan namnet och de valfria fälten. Ordningen styr också
// vilket fält som får fokus först när flera är felaktiga.
const nameField: TextFieldSpec = { field: "name", label: "Namn" };
const detailFields: TextFieldSpec[] = [
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

const fieldOrder: WineField[] = [
  nameField.field,
  "type",
  ...detailFields.map(({ field }) => field),
];

export function AddWineForm({ tastingId }: { tastingId: string }) {
  const [state, formAction, isPending] = useActionState(
    keepInputWhenOffline(addWineAction.bind(null, tastingId), fieldOrder),
    initialState,
  );
  const inputs = useRef<Partial<Record<WineField, HTMLInputElement | null>>>(
    {},
  );
  const hasFieldErrors = Object.keys(state.fieldErrors ?? {}).length > 0;
  const typeError = state.fieldErrors?.type?.[0];

  // Vid fel hamnar fokus på första felaktiga fältet, efter ett tillagt vin
  // på namnfältet så att nästa vin kan skrivas in direkt.
  useEffect(() => {
    if (state === initialState) return;
    const firstInvalid = fieldOrder.find((field) => state.fieldErrors?.[field]);
    const target = firstInvalid
      ? inputs.current[firstInvalid]
      : state.message
        ? inputs.current.name
        : null;
    target?.focus();
  }, [state]);

  function renderTextField({ field, label, hint, inputMode }: TextFieldSpec) {
    return (
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
    );
  }

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
      {renderTextField(nameField)}
      <fieldset
        aria-describedby={typeError ? "wine-type-error" : undefined}
        className="flex flex-col gap-1"
      >
        <legend className="font-medium">Vintyp</legend>
        <p className="text-sm text-on-surface-variant">
          Styr vilka smakklockor deltagarna fyller i.
        </p>
        <div className="flex flex-wrap gap-x-4">
          {WINE_TYPES.map((type, index) => (
            <label
              key={type}
              className="flex min-h-11 cursor-pointer items-center gap-2"
            >
              <input
                ref={
                  index === 0
                    ? (input) => {
                        inputs.current.type = input;
                      }
                    : undefined
                }
                type="radio"
                name="type"
                value={type}
                defaultChecked={state.values?.type === type}
                className="size-5 accent-primary"
              />
              {wineTypeLabels[type]}
            </label>
          ))}
        </div>
        {typeError && (
          <p id="wine-type-error" className="text-error">
            <strong>Fel:</strong> {typeError}
          </p>
        )}
      </fieldset>
      {detailFields.map(renderTextField)}
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
