import { z } from "zod";
import { TASTING_NAME_MAX } from "@/domain/tasting";

export const tastingInputSchema = z.object({
  name: z
    .string({ error: "Ange provningens namn" })
    .trim()
    .min(1, "Ange provningens namn")
    .max(
      TASTING_NAME_MAX,
      `Namnet får vara högst ${TASTING_NAME_MAX} tecken`,
    ),
});

export type TastingInput = z.infer<typeof tastingInputSchema>;

// Id:t kommer från sökvägen. Ett ogiltigt id ska ge "hittades inte",
// inte ett databasfel.
export const tastingIdSchema = z.uuid();
