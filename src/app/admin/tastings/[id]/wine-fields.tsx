"use client";

import { TextField } from "@/app/_components/text-field";
import type { WineField } from "@/api/admin-tasting-actions";
import type { FormState } from "@/api/form-state";
import { WINE_TYPES, type WineType } from "@/domain/wine";

// Fälten delas av formulären för att lägga till och ändra vin.

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
  {
    field: "articleNumber",
    label: "Artikelnummer på Systembolaget (valfritt)",
    hint: "Med förpackning, till exempel 262708. Visas som länk till Systembolaget.",
    inputMode: "numeric",
  },
];

export const wineFieldOrder: WineField[] = [
  nameField.field,
  "type",
  ...detailFields.map(({ field }) => field),
];

export type WineInputs = Partial<Record<WineField, HTMLInputElement | null>>;

export function firstInvalidWineField(
  state: FormState<WineField>,
): WineField | undefined {
  return wineFieldOrder.find((field) => state.fieldErrors?.[field]);
}

// idPrefix håller id:na unika när flera vinformulär finns på sidan.
// För vintypen registreras första alternativet, som får fokus vid fel.
export function WineFields({
  idPrefix,
  values,
  fieldErrors,
  inputs,
}: {
  idPrefix: string;
  values?: Partial<Record<WineField, string>>;
  fieldErrors?: FormState<WineField>["fieldErrors"];
  inputs: React.RefObject<WineInputs>;
}) {
  const typeError = fieldErrors?.type?.[0];
  const typeErrorId = `${idPrefix}-type-error`;

  function renderTextField({ field, label, hint, inputMode }: TextFieldSpec) {
    return (
      <TextField
        key={field}
        ref={(input) => {
          inputs.current[field] = input;
        }}
        id={`${idPrefix}-${field}`}
        name={field}
        label={label}
        hint={hint}
        inputMode={inputMode}
        defaultValue={values?.[field]}
        error={fieldErrors?.[field]?.[0]}
      />
    );
  }

  return (
    <>
      {renderTextField(nameField)}
      <fieldset
        aria-describedby={typeError ? typeErrorId : undefined}
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
                defaultChecked={values?.type === type}
                className="size-5 accent-primary"
              />
              {wineTypeLabels[type]}
            </label>
          ))}
        </div>
        {typeError && (
          <p id={typeErrorId} className="text-error">
            <strong>Fel:</strong> {typeError}
          </p>
        )}
      </fieldset>
      {detailFields.map(renderTextField)}
    </>
  );
}
