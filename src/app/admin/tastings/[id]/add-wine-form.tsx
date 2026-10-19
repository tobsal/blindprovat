"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  addWineAction,
  type FormState,
  type WineField,
} from "@/api/admin-tasting-actions";

const initialState: FormState<WineField> = {};

function WineTextField({
  field,
  label,
  state,
  inputMode,
  hint,
}: {
  field: WineField;
  label: string;
  state: FormState<WineField>;
  inputMode?: "numeric";
  hint?: string;
}) {
  const id = `wine-${field}`;
  const error = state.fieldErrors?.[field]?.[0];
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint && <p id={`${id}-hint`}>{hint}</p>}
      <input
        id={id}
        name={field}
        type="text"
        inputMode={inputMode}
        defaultValue={state.values?.[field]}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="min-h-11 rounded border border-foreground bg-background px-3 focus-visible:outline-2 focus-visible:outline-offset-2"
      />
      {error && (
        <p id={`${id}-error`}>
          <strong>Fel:</strong> {error}
        </p>
      )}
    </div>
  );
}

export function AddWineForm({ tastingId }: { tastingId: string }) {
  const [state, formAction, isPending] = useActionState(
    addWineAction.bind(null, tastingId),
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const hasFieldErrors = Object.keys(state.fieldErrors ?? {}).length > 0;

  // Vid fel hamnar fokus på första felaktiga fältet, efter ett tillagt vin
  // på namnfältet så att nästa vin kan skrivas in direkt.
  useEffect(() => {
    const form = formRef.current;
    if (!form || state === initialState) return;
    const target =
      form.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      (state.message ? form.querySelector<HTMLElement>("#wine-name") : null);
    target?.focus();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      aria-labelledby="add-wine-heading"
      className="mt-4 flex flex-col gap-4"
    >
      <h3 id="add-wine-heading" className="font-semibold">
        Lägg till vin
      </h3>
      {state.formError && (
        <p role="alert" className="border-l-4 border-foreground pl-3">
          <strong>Fel:</strong> {state.formError}
        </p>
      )}
      {hasFieldErrors && (
        <p role="alert" className="border-l-4 border-foreground pl-3">
          <strong>Fel:</strong> Rätta de markerade fälten.
        </p>
      )}
      <WineTextField field="name" label="Namn" state={state} />
      <WineTextField field="producer" label="Producent (valfritt)" state={state} />
      <WineTextField field="grape" label="Druva (valfritt)" state={state} />
      <WineTextField field="region" label="Region (valfritt)" state={state} />
      <WineTextField field="country" label="Land (valfritt)" state={state} />
      <WineTextField
        field="vintage"
        label="Årgång (valfritt)"
        hint="Lämna tomt om vinet är årgångslöst."
        inputMode="numeric"
        state={state}
      />
      <WineTextField
        field="price"
        label="Pris i kronor (valfritt)"
        inputMode="numeric"
        state={state}
      />
      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 self-start rounded bg-foreground px-4 text-background focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-70"
      >
        {isPending ? "Lägger till …" : "Lägg till vin"}
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
