"use client";

import { useActionState, useEffect, useRef } from "react";
import { TextField } from "@/app/_components/text-field";
import {
  createTastingAction,
  type FormState,
  type TastingField,
} from "@/api/admin-tasting-actions";

const initialState: FormState<TastingField> = {};

export function CreateTastingForm() {
  const [state, formAction, isPending] = useActionState(
    createTastingAction,
    initialState,
  );
  const nameInput = useRef<HTMLInputElement>(null);

  // Vid fel hamnar fokus på det felaktiga fältet.
  useEffect(() => {
    if (state !== initialState && state.fieldErrors?.name) {
      nameInput.current?.focus();
    }
  }, [state]);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4" noValidate>
      <TextField
        ref={nameInput}
        id="tasting-name"
        name="name"
        label="Namn på provningen"
        required
        defaultValue={state.values?.name}
        error={state.fieldErrors?.name?.[0]}
      />
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary self-start disabled:opacity-70"
      >
        {isPending ? "Skapar …" : "Skapa provning"}
      </button>
    </form>
  );
}
