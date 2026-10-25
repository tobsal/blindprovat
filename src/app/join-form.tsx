"use client";

import { useActionState, useEffect, useRef } from "react";
import { joinTastingAction, type JoinField } from "@/api/participant-actions";
import type { FormState } from "@/api/form-state";
import { FormError } from "@/app/_components/form-error";
import { keepInputWhenOffline } from "@/app/_components/keep-input-when-offline";
import { TextField } from "@/app/_components/text-field";

const initialState: FormState<JoinField> = {};
const offlineSafeJoin = keepInputWhenOffline(joinTastingAction, [
  "code",
  "displayName",
]);

export function JoinForm() {
  const [state, formAction, isPending] = useActionState(
    offlineSafeJoin,
    initialState,
  );
  const codeInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  // Vid fel hamnar fokus på första felaktiga fältet.
  useEffect(() => {
    if (state === initialState) return;
    if (state.fieldErrors?.code) codeInput.current?.focus();
    else if (state.fieldErrors?.displayName) nameInput.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.formError && <FormError>{state.formError}</FormError>}
      <TextField
        ref={codeInput}
        id="join-code"
        name="code"
        label="Provningskod"
        hint="Du får koden av den som håller i provningen."
        autoComplete="off"
        autoCapitalize="characters"
        required
        defaultValue={state.values?.code}
        error={state.fieldErrors?.code?.[0]}
      />
      <TextField
        ref={nameInput}
        id="join-name"
        name="displayName"
        label="Ditt namn"
        autoComplete="nickname"
        required
        defaultValue={state.values?.displayName}
        error={state.fieldErrors?.displayName?.[0]}
      />
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary disabled:opacity-70"
      >
        {isPending ? "Går med …" : "Gå med"}
      </button>
    </form>
  );
}
