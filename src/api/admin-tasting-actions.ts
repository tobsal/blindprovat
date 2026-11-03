"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { TastingStatus } from "@/domain/tasting";
import { advanceTastingStatus, createTasting } from "@/repositories/tastings";
import { addWine } from "@/repositories/wines";
import { tastingIdSchema, tastingInputSchema } from "@/validation/tasting";
import { wineFormSchema } from "@/validation/wine";
import { requireAdminOwnerId } from "./admin-session";
import {
  messageForRepositoryError,
  tastingNotFoundMessage,
} from "./error-messages";
import { formValues, type FormState } from "./form-state";

const tastingFields = ["name"] as const;
export type TastingField = (typeof tastingFields)[number];

export async function createTastingAction(
  _previous: FormState<TastingField>,
  formData: FormData,
): Promise<FormState<TastingField>> {
  const ownerId = await requireAdminOwnerId();
  const values = formValues(formData, tastingFields);
  const parsed = tastingInputSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const tasting = await createTasting(ownerId, parsed.data);
  revalidatePath("/admin");
  redirect(`/admin/tastings/${tasting.id}`);
}

// Fälten följer schemat, så att ett nytt vinfält inte behöver läggas till här.
const wineFields = wineFormSchema.keyof().options;
export type WineField = (typeof wineFields)[number];

export async function addWineAction(
  rawTastingId: string,
  _previous: FormState<WineField>,
  formData: FormData,
): Promise<FormState<WineField>> {
  const ownerId = await requireAdminOwnerId();
  const tastingId = tastingIdSchema.safeParse(rawTastingId);
  if (!tastingId.success) return { formError: tastingNotFoundMessage };

  const values = formValues(formData, wineFields);
  const parsed = wineFormSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const result = await addWine(ownerId, tastingId.data, parsed.data);
  if (!result.ok) {
    return {
      formError: messageForRepositoryError(
        result.error,
        "Viner kan bara läggas till innan provningen har startat.",
      ),
      values,
    };
  }

  revalidatePath(`/admin/tastings/${tastingId.data}`);
  return { message: `Vin ${result.wine.blindNumber} är tillagt.` };
}

// Statusknapparna har inga fält, bara fel och kvitto. Föregående tillstånd
// och formulärdata behövs inte, så de tas inte emot.
export type StatusFormState = FormState<never>;

async function advanceStatus(
  rawTastingId: string,
  from: TastingStatus,
  invalidStateMessage: string,
  successMessage: string,
): Promise<StatusFormState> {
  const ownerId = await requireAdminOwnerId();
  const tastingId = tastingIdSchema.safeParse(rawTastingId);
  if (!tastingId.success) return { formError: tastingNotFoundMessage };

  const result = await advanceTastingStatus(ownerId, tastingId.data, from);
  if (!result.ok) {
    return {
      formError: messageForRepositoryError(result.error, invalidStateMessage),
    };
  }

  revalidatePath(`/admin/tastings/${tastingId.data}`);
  revalidatePath("/admin");
  return { message: successMessage };
}

export async function startTastingAction(
  rawTastingId: string,
): Promise<StatusFormState> {
  return advanceStatus(
    rawTastingId,
    "draft",
    "Provningen kan bara startas medan den förbereds och har minst ett vin.",
    "Provningen har startat.",
  );
}

export async function revealTastingAction(
  rawTastingId: string,
): Promise<StatusFormState> {
  return advanceStatus(
    rawTastingId,
    "live",
    "Provningen kan bara avslutas medan den pågår.",
    "Provningen är avslutad och vinerna är avslöjade.",
  );
}
