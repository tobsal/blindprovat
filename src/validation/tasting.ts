import { z } from "zod";
import { TASTING_NAME_MAX } from "@/domain/tasting";

const nameRequiredMessage = "Ange provningens namn";

export const tastingInputSchema = z.object({
  name: z
    .string({ error: nameRequiredMessage })
    .trim()
    .min(1, nameRequiredMessage)
    .max(
      TASTING_NAME_MAX,
      `Namnet får vara högst ${TASTING_NAME_MAX} tecken`,
    ),
});

export type TastingInput = z.infer<typeof tastingInputSchema>;

// Id:t kommer från sökvägen. Ett ogiltigt id ska ge "hittades inte",
// inte ett databasfel.
export const tastingIdSchema = z.uuid();
