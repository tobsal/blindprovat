"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { joinTasting } from "@/repositories/participants";
import { joinTastingInputSchema } from "@/validation/participant";
import { saveRating } from "@/repositories/ratings";
import { ratingInputSchema } from "@/validation/rating";
import { blindNumberSchema } from "@/validation/wine";
import {
  joinNotFoundMessage,
  wineClosedMessage,
  wineNotFoundMessage,
} from "./error-messages";
import { formValues, type FormState } from "./form-state";
import { findWineForParticipant } from "./participant-wine";
import {
  requireParticipant,
  setParticipantSession,
} from "./participant-session";

const joinFields = ["code", "displayName"] as const;
export type JoinField = (typeof joinFields)[number];

export async function joinTastingAction(
  _previous: FormState<JoinField>,
  formData: FormData,
): Promise<FormState<JoinField>> {
  const values = formValues(formData, joinFields);
  const parsed = joinTastingInputSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const result = await joinTasting(parsed.data);
  if (!result.ok) {
    const fieldErrors =
      result.error === "name_taken"
        ? { displayName: ["Det namnet används redan i provningen. Välj ett annat."] }
        : { code: [joinNotFoundMessage] };
    return { fieldErrors, values };
  }

  await setParticipantSession(result.sessionToken);
  redirect("/tasting");
}

// Poäng och taggar väljs med knappar och skickas som dolda fält, texten
// skrivs i vanliga fält. Bara texten skickas tillbaka vid fel, poäng och
// taggar finns kvar i formuläret.
const ratingTextFields = ["note", "guess"] as const;
export type RatingField = "score" | "tags" | (typeof ratingTextFields)[number];

export async function saveRatingAction(
  rawBlindNumber: string,
  _previous: FormState<RatingField>,
  formData: FormData,
): Promise<FormState<RatingField>> {
  const participant = await requireParticipant();
  const blindNumber = blindNumberSchema.safeParse(rawBlindNumber);
  if (!blindNumber.success) return { formError: wineNotFoundMessage };

  const values = formValues(formData, ratingTextFields);
  const score = formData.get("score");
  const parsed = ratingInputSchema.safeParse({
    ...values,
    score: typeof score === "string" && score !== "" ? Number(score) : undefined,
    tags: formData.getAll("tags").filter((tag) => typeof tag === "string"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  // Vinet slås upp i deltagarens egen provning, aldrig via ett id utifrån.
  const wine = await findWineForParticipant(participant, blindNumber.data);
  if (!wine) return { formError: wineNotFoundMessage, values };

  const result = await saveRating(participant, wine.id, parsed.data);
  if (!result.ok) {
    return {
      formError:
        result.error === "not_found" ? wineNotFoundMessage : wineClosedMessage,
      values,
    };
  }
  return { message: "Betyget är sparat.", values };
}
