import { z } from "zod";
import {
  GUESS_MAX,
  MAX_TAGS,
  NOTE_MAX,
  RATING_TAGS,
  SCORE_MAX,
  SCORE_MIN,
  TASTE_CLOCK_MAX,
  TASTE_CLOCK_MIN,
} from "@/domain/rating";
import { optionalText } from "./optional-text";

const scoreMessage = `Välj ett betyg mellan ${SCORE_MIN} och ${SCORE_MAX}`;
const tasteClockMessage = `Välj ett värde mellan ${TASTE_CLOCK_MIN} och ${TASTE_CLOCK_MAX} eller lämna tomt`;

// Smakklockorna är frivilliga. null betyder inte angivet.
const tasteClock = z
  .number({ error: tasteClockMessage })
  .int(tasteClockMessage)
  .min(TASTE_CLOCK_MIN, tasteClockMessage)
  .max(TASTE_CLOCK_MAX, tasteClockMessage)
  .nullish()
  .transform((value) => value ?? null);

export const ratingInputSchema = z.object({
  score: z
    .number({ error: scoreMessage })
    .int(scoreMessage)
    .min(SCORE_MIN, scoreMessage)
    .max(SCORE_MAX, scoreMessage),
  note: optionalText(
    NOTE_MAX,
    `Anteckningen får vara högst ${NOTE_MAX} tecken`,
  ),
  tags: z
    .array(z.enum(RATING_TAGS, { error: "Välj bland taggarna i listan" }))
    .max(MAX_TAGS, `Du kan välja högst ${MAX_TAGS} taggar`)
    .refine((tags) => new Set(tags).size === tags.length, {
      error: "Varje tagg kan bara väljas en gång",
    })
    .default([]),
  guess: optionalText(
    GUESS_MAX,
    `Gissningen får vara högst ${GUESS_MAX} tecken`,
  ),
  sweetness: tasteClock,
  body: tasteClock,
  astringency: tasteClock,
  acidity: tasteClock,
});

export type RatingInput = z.infer<typeof ratingInputSchema>;
