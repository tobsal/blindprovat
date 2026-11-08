"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { FormState } from "@/api/form-state";
import { saveRatingAction, type RatingField } from "@/api/participant-actions";
import { FormError } from "@/app/_components/form-error";
import { keepInputWhenOffline } from "@/app/_components/keep-input-when-offline";
import { tasteClockLabels } from "@/app/_components/taste-clock-labels";
import { TextArea } from "@/app/_components/text-area";
import { TextField } from "@/app/_components/text-field";
import {
  MAX_TAGS,
  NOTE_MAX,
  RATING_TAGS,
  SCORE_MAX,
  SCORE_MIN,
  TASTE_CLOCK_MAX,
  TASTE_CLOCK_MIN,
  tasteClocksForWineType,
  type RatingTag,
  type TasteClock,
  type TasteClockValues,
} from "@/domain/rating";
import type { WineType } from "@/domain/wine";
import { ratingTagLabels } from "../../rating-tag-labels";

const initialState: FormState<RatingField> = {};
const scores = Array.from(
  { length: SCORE_MAX - SCORE_MIN + 1 },
  (_, index) => SCORE_MIN + index,
);
const clockValues = Array.from(
  { length: TASTE_CLOCK_MAX - TASTE_CLOCK_MIN + 1 },
  (_, index) => TASTE_CLOCK_MIN + index,
);
const noClocks: TasteClockValues = {
  sweetness: null,
  body: null,
  astringency: null,
  acidity: null,
};

type Props = {
  blindNumber: number;
  isOpen: boolean;
  type: WineType | null;
  initial:
    | ({
        score: number | null;
        note: string | null;
        tags: RatingTag[];
        guess: string | null;
      } & TasteClockValues)
    | null;
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

const selectedButtonClass =
  "border-primary bg-primary text-on-primary hover:not-disabled:bg-primary-hover active:not-disabled:bg-primary-pressed";
const unselectedButtonClass =
  "border-outline text-on-surface hover:not-disabled:bg-surface-high active:not-disabled:bg-surface-highest";

// En smakklocka som tolv knappar i två rader. Ett tryck till på det valda
// värdet tar bort valet, eftersom klockorna är frivilliga.
function TasteClockScale({
  clock,
  value,
  onChange,
  error,
  firstButtonRef,
}: {
  clock: TasteClock;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  firstButtonRef?: React.Ref<HTMLButtonElement>;
}) {
  const { name, low, high } = tasteClockLabels[clock];
  const headingId = `clock-${clock}-heading`;
  const scaleId = `clock-${clock}-scale`;
  const errorId = `clock-${clock}-error`;
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      aria-describedby={[scaleId, error && errorId].filter(Boolean).join(" ")}
      className="flex flex-col gap-2"
    >
      <h3 id={headingId} className="font-medium">
        {name}
      </h3>
      <p
        id={scaleId}
        className="flex justify-between text-sm text-on-surface-variant"
      >
        <span>
          {TASTE_CLOCK_MIN} = {low}
        </span>
        <span>
          {TASTE_CLOCK_MAX} = {high}
        </span>
      </p>
      <div className="grid grid-cols-6 gap-2">
        {clockValues.map((option, index) => {
          const selected = value === option;
          return (
            <button
              key={option}
              ref={index === 0 ? firstButtonRef : undefined}
              type="button"
              aria-pressed={selected}
              aria-label={`${option} av ${TASTE_CLOCK_MAX}`}
              onClick={() => onChange(selected ? null : option)}
              className={`flex min-h-11 items-center justify-center rounded-lg border font-medium transition-colors motion-reduce:transition-none ${
                selected ? selectedButtonClass : unselectedButtonClass
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-on-surface-variant">
        {value === null
          ? "Inget valt."
          : `Du har valt ${value} av ${TASTE_CLOCK_MAX}.`}
      </p>
      {error && (
        <p id={errorId} className="text-error">
          <strong>Fel:</strong> {error}
        </p>
      )}
    </div>
  );
}

export function RatingForm({ blindNumber, isOpen, type, initial }: Props) {
  const [score, setScore] = useState<number | null>(initial?.score ?? null);
  const [clocks, setClocks] = useState<TasteClockValues>(() =>
    initial
      ? {
          sweetness: initial.sweetness,
          body: initial.body,
          astringency: initial.astringency,
          acidity: initial.acidity,
        }
      : noClocks,
  );
  const [tags, setTags] = useState<RatingTag[]>(initial?.tags ?? []);
  const visibleClocks = tasteClocksForWineType(type);
  // Har vinet varit öppet medan formuläret visats ska det ligga kvar, låst, när
  // vinet stängs. Annars skulle det som skrivits försvinna.
  const [seenOpen, setSeenOpen] = useState(isOpen);

  // Justeras under rendering i stället för i en effekt, så att det inte blir en
  // extra rendering efteråt.
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
  const firstClockButtons = useRef<
    Partial<Record<TasteClock, HTMLButtonElement | null>>
  >({});
  const guessInput = useRef<HTMLInputElement>(null);
  const noteInput = useRef<HTMLTextAreaElement>(null);

  // Vid fel hamnar fokus på första felaktiga fältet.
  useEffect(() => {
    if (state === initialState) return;
    const invalidClock = visibleClocks.find(
      (clock) => state.fieldErrors?.[clock],
    );
    if (state.fieldErrors?.score) firstScoreButton.current?.focus();
    else if (invalidClock) firstClockButtons.current[invalidClock]?.focus();
    else if (state.fieldErrors?.guess) guessInput.current?.focus();
    else if (state.fieldErrors?.note) noteInput.current?.focus();
  }, [state, visibleClocks]);

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
        {visibleClocks.map((clock) => (
          <input
            key={clock}
            type="hidden"
            name={clock}
            value={clocks[clock] ?? ""}
          />
        ))}
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
                  className={`flex min-h-12 items-center justify-center gap-1 rounded-full border font-medium transition-colors motion-reduce:transition-none ${
                    selected
                      ? "border-primary bg-primary text-on-primary hover:not-disabled:bg-primary-hover active:not-disabled:bg-primary-pressed"
                      : "border-outline text-on-surface hover:not-disabled:bg-surface-high active:not-disabled:bg-surface-highest"
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

        <section
          aria-labelledby="clocks-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <h2 id="clocks-heading" className="font-medium">
              Smakklockor (valfritt)
            </h2>
            <p className="text-sm text-on-surface-variant">
              Som på Systembolaget. Tryck på det valda värdet igen för att ta
              bort det.
            </p>
          </div>
          {visibleClocks.map((clock) => (
            <TasteClockScale
              key={clock}
              clock={clock}
              value={clocks[clock]}
              onChange={(value) =>
                setClocks((current) => ({ ...current, [clock]: value }))
              }
              error={state.fieldErrors?.[clock]?.[0]}
              firstButtonRef={(button) => {
                firstClockButtons.current[clock] = button;
              }}
            />
          ))}
        </section>

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
                  className={`flex min-h-11 items-center gap-2 rounded-lg border px-4 font-medium transition-colors disabled:opacity-50 motion-reduce:transition-none ${
                    selected
                      ? "border-primary bg-primary text-on-primary hover:not-disabled:bg-primary-hover active:not-disabled:bg-primary-pressed"
                      : "border-outline text-on-surface-variant hover:not-disabled:bg-surface-high active:not-disabled:bg-surface-highest"
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
