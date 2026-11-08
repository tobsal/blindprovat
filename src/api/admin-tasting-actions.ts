"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { TastingStatus } from "@/domain/tasting";
import {
  advanceTastingStatus,
  createTasting,
  deleteTasting,
} from "@/repositories/tastings";
import {
  addWine,
  deleteWine,
  setWineOpen,
  updateWine,
} from "@/repositories/wines";
import { tastingIdSchema, tastingInputSchema } from "@/validation/tasting";
import { wineFormSchema, wineIdSchema } from "@/validation/wine";
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

export async function updateWineAction(
  rawWineId: string,
  _previous: FormState<WineField>,
  formData: FormData,
): Promise<FormState<WineField>> {
  const ownerId = await requireAdminOwnerId();
  const wineId = wineIdSchema.safeParse(rawWineId);
  if (!wineId.success) return { formError: tastingNotFoundMessage };

  const values = formValues(formData, wineFields);
  const parsed = wineFormSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const result = await updateWine(ownerId, wineId.data, parsed.data);
  if (!result.ok) {
    return {
      formError: messageForRepositoryError(
        result.error,
        "Viner kan bara ändras innan provningen har startat.",
      ),
      values,
    };
  }

  revalidatePath(`/admin/tastings/${result.wine.tastingId}`);
  return { message: `Vin ${result.wine.blindNumber} är ändrat.` };
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

// Lyckas borttagningen skickas admin till listan, så bara fel returneras.
export async function deleteTastingAction(
  rawTastingId: string,
): Promise<StatusFormState> {
  const ownerId = await requireAdminOwnerId();
  const tastingId = tastingIdSchema.safeParse(rawTastingId);
  if (!tastingId.success) return { formError: tastingNotFoundMessage };

  const result = await deleteTasting(ownerId, tastingId.data);
  if (!result.ok) return { formError: tastingNotFoundMessage };

  revalidatePath("/admin");
  redirect("/admin");
}

export async function setWineOpenAction(
  rawWineId: string,
  isOpen: boolean,
): Promise<StatusFormState> {
  const ownerId = await requireAdminOwnerId();
  const wineId = wineIdSchema.safeParse(rawWineId);
  if (!wineId.success) return { formError: tastingNotFoundMessage };

  const result = await setWineOpen(ownerId, wineId.data, isOpen);
  if (!result.ok) {
    return {
      formError: messageForRepositoryError(
        result.error,
        "Viner kan bara öppnas och stängas medan provningen pågår.",
      ),
    };
  }

  const { blindNumber, tastingId } = result.wine;
  revalidatePath(`/admin/tastings/${tastingId}`);
  return {
    message: isOpen
      ? `Vin ${blindNumber} är öppet för betyg.`
      : `Vin ${blindNumber} är stängt för betyg.`,
  };
}

export async function deleteWineAction(
  rawWineId: string,
): Promise<StatusFormState> {
  const ownerId = await requireAdminOwnerId();
  const wineId = wineIdSchema.safeParse(rawWineId);
  if (!wineId.success) return { formError: tastingNotFoundMessage };

  const result = await deleteWine(ownerId, wineId.data);
  if (!result.ok) {
    return {
      formError: messageForRepositoryError(
        result.error,
        "Viner kan bara tas bort innan provningen har startat.",
      ),
    };
  }

  const { blindNumber, tastingId } = result.wine;
  revalidatePath(`/admin/tastings/${tastingId}`);
  return {
    message: `Vin ${blindNumber} är borttaget. Vinerna efter har fått nya nummer.`,
  };
}
