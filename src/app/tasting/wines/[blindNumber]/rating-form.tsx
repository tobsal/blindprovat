"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { FormState } from "@/api/form-state";
import { saveRatingAction, type RatingField } from "@/api/participant-actions";
import { FormError } from "@/app/_components/form-error";
import { keepInputWhenOffline } from "@/app/_components/keep-input-when-offline";
import { TextArea } from "@/app/_components/text-area";
import { TextField } from "@/app/_components/text-field";
import {
  MAX_TAGS,
  NOTE_MAX,
  RATING_TAGS,
  SCORE_MAX,
  SCORE_MIN,
  type RatingTag,
} from "@/domain/rating";
import { ratingTagLabels } from "../../rating-tag-labels";

const initialState: FormState<RatingField> = {};
const scores = Array.from(
  { length: SCORE_MAX - SCORE_MIN + 1 },
  (_, index) => SCORE_MIN + index,
);

type Props = {
  blindNumber: number;
  isOpen: boolean;
  initial: {
    score: number | null;
    note: string | null;
    tags: RatingTag[];
    guess: string | null;
  } | null;
};

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function RatingForm({ blindNumber, isOpen, initial }: Props) {
  const [score, setScore] = useState<number | null>(initial?.score ?? null);
  const [tags, setTags] = useState<RatingTag[]>(initial?.tags ?? []);
  // Har vinet varit öppet medan formuläret visats ska det ligga kvar, låst, när
  // vinet stängs. Annars skulle det som skrivits försvinna.
  const [seenOpen, setSeenOpen] = useState(isOpen);
  if (isOpen && !seenOpen) setSeenOpen(true);

  const action = useMemo(
    () =>
      keepInputWhenOffline(
        saveRatingAction.bind(null, String(blindNumber)),
        ["note", "guess"],
      ),
    [blindNumber],
  );
  const [state, formAction, isPending] = useActionState(action, initialState);

  const firstScoreButton = useRef<HTMLButtonElement>(null);
  const guessInput = useRef<HTMLInputElement>(null);
  const noteInput = useRef<HTMLTextAreaElement>(null);

  // Vid fel hamnar fokus på första felaktiga fältet.
  useEffect(() => {
    if (state === initialState) return;
    if (state.fieldErrors?.score) firstScoreButton.current?.focus();
    else if (state.fieldErrors?.guess) guessInput.current?.focus();
    else if (state.fieldErrors?.note) noteInput.current?.focus();
  }, [state]);

  function toggleTag(tag: RatingTag) {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag],
    );
  }

  if (!isOpen && !seenOpen && !initial) {
    return (
      <p>
        Vin {blindNumber} är inte öppet för betyg ännu. Sidan uppdateras när
        värden öppnar vinet.
      </p>
    );
  }

  const tagLimitReached = tags.length >= MAX_TAGS;
  const scoreError = state.fieldErrors?.score?.[0];
  const tagsError = state.fieldErrors?.tags?.[0];

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      {/* Annonseras när vinet stängs medan deltagaren skriver. Det som
          skrivits finns kvar. */}
      <div aria-live="assertive">
        {!isOpen && (
          <FormError>
            Vinet har stängts för betyg. Det du skrivit finns kvar här men går
            inte längre att spara.
          </FormError>
        )}
      </div>
      {state.formError && <FormError>{state.formError}</FormError>}

      <fieldset disabled={!isOpen} className="flex min-w-0 flex-col gap-6">
        <input type="hidden" name="score" value={score ?? ""} />
        {tags.map((tag) => (
          <input key={tag} type="hidden" name="tags" value={tag} />
        ))}

        <div
          role="group"
          aria-labelledby="score-heading"
          aria-describedby={scoreError ? "score-error" : undefined}
          className="flex flex-col gap-2"
        >
          <h2 id="score-heading" className="font-medium">
            Poäng
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {scores.map((value, index) => {
              const selected = score === value;
              return (
                <button
                  key={value}
                  ref={index === 0 ? firstScoreButton : undefined}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${value} av ${SCORE_MAX}`}
                  onClick={() => setScore(value)}
                  className={`flex min-h-12 items-center justify-center gap-1 rounded-full border font-medium ${
                    selected
                      ? "border-primary bg-primary text-on-primary"
                      : "border-outline text-on-surface"
                  }`}
                >
                  {selected && <CheckIcon />}
                  {value}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-on-surface-variant">
            {score === null
              ? "Välj ett betyg."
              : `Du har valt ${score} av ${SCORE_MAX}.`}
          </p>
          {scoreError && (
            <p id="score-error" className="text-error">
              <strong>Fel:</strong> {scoreError}
            </p>
          )}
        </div>

        <div
          role="group"
          aria-labelledby="tags-heading"
          aria-describedby="tags-hint"
          className="flex flex-col gap-2"
        >
          <h2 id="tags-heading" className="font-medium">
            Smak och doft
          </h2>
          <p id="tags-hint" className="text-sm text-on-surface-variant">
            Välj högst {MAX_TAGS}.
            {tagLimitReached && " Du har valt så många du kan."}
          </p>
          <div className="flex flex-wrap gap-2">
            {RATING_TAGS.map((tag) => {
              const selected = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={selected}
                  disabled={!selected && tagLimitReached}
                  onClick={() => toggleTag(tag)}
                  className={`flex min-h-11 items-center gap-2 rounded-lg border px-4 font-medium disabled:opacity-50 ${
                    selected
                      ? "border-primary bg-primary text-on-primary"
                      : "border-outline text-on-surface-variant"
                  }`}
                >
                  {selected && <CheckIcon />}
                  {ratingTagLabels[tag]}
                </button>
              );
            })}
          </div>
          {tagsError && (
            <p className="text-error">
              <strong>Fel:</strong> {tagsError}
            </p>
          )}
        </div>

        <TextField
          ref={guessInput}
          id="rating-guess"
          name="guess"
          label="Gissning (valfritt)"
          hint="Druva, land eller årgång."
          defaultValue={state.values?.guess ?? initial?.guess ?? undefined}
          error={state.fieldErrors?.guess?.[0]}
        />
        <TextArea
          ref={noteInput}
          id="rating-note"
          name="note"
          label="Anteckning (valfritt)"
          hint={`Högst ${NOTE_MAX} tecken.`}
          maxLength={NOTE_MAX}
          defaultValue={state.values?.note ?? initial?.note ?? undefined}
          error={state.fieldErrors?.note?.[0]}
        />

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary disabled:opacity-70"
        >
          {isPending ? "Sparar …" : "Spara betyg"}
        </button>
      </fieldset>

      <p role="status" className="min-h-6 text-sm">
        {state.message}
      </p>
    </form>
  );
}
