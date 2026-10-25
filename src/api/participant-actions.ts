"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { joinTasting } from "@/repositories/participants";
import { joinTastingInputSchema } from "@/validation/participant";
import { joinNotFoundMessage } from "./error-messages";
import { formValues, type FormState } from "./form-state";
import { setParticipantSession } from "./participant-session";

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
