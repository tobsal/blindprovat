import { z } from "zod";
import {
  GUESS_MAX,
  MAX_TAGS,
  NOTE_MAX,
  RATING_TAGS,
  SCORE_MAX,
  SCORE_MIN,
} from "@/domain/rating";

const scoreMessage = `Välj ett betyg mellan ${SCORE_MIN} och ${SCORE_MAX}`;

// Trimmar texten och gör tom text eller saknat värde till null.
function optionalText(max: number, tooLongMessage: string) {
  return z
    .string()
    .trim()
    .max(max, tooLongMessage)
    .nullish()
    .transform((value) => value || null);
}

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
});

export type RatingInput = z.infer<typeof ratingInputSchema>;
