"use client";

import { useActionState } from "react";
import { createTastingAction } from "@/api/admin-tasting-actions";

export function CreateTastingForm() {
  const [state, formAction, isPending] = useActionState(
    createTastingAction,
    {},
  );
  const nameError = state.fieldErrors?.name?.[0];

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="tasting-name" className="font-medium">
          Namn på provningen
        </label>
        <input
          id="tasting-name"
          name="name"
          type="text"
          required
          defaultValue={state.values?.name}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "tasting-name-error" : undefined}
          className="min-h-11 rounded border border-foreground bg-background px-3 focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        {nameError && (
          <p id="tasting-name-error" role="alert">
            <strong>Fel:</strong> {nameError}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 self-start rounded bg-foreground px-4 text-background focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-70"
      >
        {isPending ? "Skapar …" : "Skapa provning"}
      </button>
    </form>
  );
}
