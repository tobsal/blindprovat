"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FormError } from "@/app/_components/form-error";
import { keepInputOnFailure } from "@/app/_components/keep-input-on-failure";
import { useToast } from "@/app/_components/toast";
import {
  revealTastingAction,
  startTastingAction,
  type StatusFormState,
} from "@/api/admin-tasting-actions";
import type { TastingStatus } from "@/domain/tasting";

const initialState: StatusFormState = {};

export function TastingStatusControl({
  tastingId,
  status,
  wineCount,
}: {
  tastingId: string;
  status: TastingStatus;
  wineCount: number;
}) {
  const [startState, startAction, isStarting] = useActionState(
    keepInputOnFailure(startTastingAction.bind(null, tastingId), []),
    initialState,
  );
  const [revealState, revealAction, isRevealing] = useActionState(
    keepInputOnFailure(revealTastingAction.bind(null, tastingId), []),
    initialState,
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const revealButton = useRef<HTMLButtonElement>(null);
  const confirmText = useRef<HTMLParagraphElement>(null);
  const showToast = useToast();

  // Efter start försvinner startknappen, så fokus flyttas till nästa steg.
  useEffect(() => {
    if (!startState.message) return;
    showToast(startState.message);
    revealButton.current?.focus();
  }, [startState, showToast]);

  // Efter avslut försvinner knapparna, så fokus flyttas till resultatet
  // (results-heading i page.tsx), som renderas i samma uppdatering.
  useEffect(() => {
    if (!revealState.message) return;
    showToast(revealState.message);
    document.getElementById("results-heading")?.focus();
  }, [revealState, showToast]);

  useEffect(() => {
    if (isConfirming) confirmText.current?.focus();
  }, [isConfirming]);

  function cancelReveal() {
    setIsConfirming(false);
    // Knappen renderas först efter att bekräftelsen stängts.
    requestAnimationFrame(() => revealButton.current?.focus());
  }

  const formError = startState.formError ?? revealState.formError;
  const hasWines = wineCount > 0;

  return (
    <div className="mt-4 flex flex-col gap-3">
      {formError && <FormError>{formError}</FormError>}

      {status === "draft" && (
        <form action={startAction} className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={!hasWines || isStarting}
            aria-describedby={hasWines ? undefined : "start-hint"}
            className="btn-primary self-start disabled:opacity-70"
          >
            {isStarting ? "Startar …" : "Starta provningen"}
          </button>
          {!hasWines && (
            <p id="start-hint">Lägg till minst ett vin innan du startar.</p>
          )}
        </form>
      )}

      {status === "live" && !isConfirming && (
        <button
          ref={revealButton}
          type="button"
          onClick={() => setIsConfirming(true)}
          className="btn-secondary self-start"
        >
          Avsluta och avslöja
        </button>
      )}

      {status === "live" && isConfirming && (
        <form
          action={revealAction}
          aria-labelledby="reveal-confirm"
          className="flex flex-col gap-3 rounded-2xl bg-surface-low p-4"
        >
          <p id="reveal-confirm" ref={confirmText} tabIndex={-1}>
            Deltagarna får se vinerna och kan inte längre sätta betyg. Det går
            inte att ångra.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isRevealing}
              className="btn-primary disabled:opacity-70"
            >
              {isRevealing ? "Avslutar …" : "Ja, avsluta"}
            </button>
            <button
              type="button"
              onClick={cancelReveal}
              disabled={isRevealing}
              className="btn-secondary"
            >
              Avbryt
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
