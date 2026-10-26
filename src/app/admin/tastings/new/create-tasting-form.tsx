"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormError } from "@/app/_components/form-error";
import { keepInputWhenOffline } from "@/app/_components/keep-input-when-offline";
import { TextField } from "@/app/_components/text-field";
import {
  createTastingAction,
  type TastingField,
} from "@/api/admin-tasting-actions";
import type { FormState } from "@/api/form-state";

const initialState: FormState<TastingField> = {};
const offlineSafeCreateTasting = keepInputWhenOffline(createTastingAction, [
  "name",
]);

export function CreateTastingForm() {
  const [state, formAction, isPending] = useActionState(
    offlineSafeCreateTasting,
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
      {state.formError && <FormError>{state.formError}</FormError>}
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
