import { z } from "zod";
import { PARTICIPANT_NAME_MAX } from "@/domain/participant";
import {
  TASTING_CODE_ALPHABET,
  TASTING_CODE_LENGTH,
} from "@/domain/tasting";

const codeMessage = `Koden består av ${TASTING_CODE_LENGTH} tecken. Kontrollera att du skrivit rätt.`;
const nameRequiredMessage = "Ange ditt namn";
const codePattern = new RegExp(
  `^[${TASTING_CODE_ALPHABET}]{${TASTING_CODE_LENGTH}}$`,
);

export const joinTastingInputSchema = z.object({
  // Godtar gemener, mellanslag och bindestreck så att koden kan skrivas som
  // den visas eller läses upp.
  code: z
    .string({ error: codeMessage })
    .transform((value) => value.replace(/[\s-]/g, "").toUpperCase())
    .pipe(z.string().regex(codePattern, codeMessage)),
  displayName: z
    .string({ error: nameRequiredMessage })
    .trim()
    .min(1, nameRequiredMessage)
    .max(
      PARTICIPANT_NAME_MAX,
      `Namnet får vara högst ${PARTICIPANT_NAME_MAX} tecken`,
    ),
});

export type JoinTastingInput = z.infer<typeof joinTastingInputSchema>;
