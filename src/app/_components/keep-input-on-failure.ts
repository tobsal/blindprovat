import { unstable_rethrow } from "next/navigation";
import type { FormState } from "@/api/form-state";

export const offlineMessage =
  "Ingen uppkoppling. Det du skrivit finns kvar. Försök igen när du är uppkopplad.";

export const serverErrorMessage =
  "Något gick fel hos oss. Det du skrivit finns kvar. Försök igen om en stund.";

type FormAction<Field extends string> = (
  previous: FormState<Field>,
  formData: FormData,
) => Promise<FormState<Field>>;

// Ett anrop som misslyckas ska inte ta bort det som skrivits in (princip 14).
// Utan uppkoppling avvisar fetch anropet med ett TypeError. Alla andra fel
// räknas som fel hos oss. Felet loggas redan på servern med ett digest, så
// det loggas inte här. Next.js egna styrfel (redirect, notFound) kastas
// vidare med unstable_rethrow, så att omdirigeringar fungerar som vanligt.
export function keepInputOnFailure<Field extends string>(
  action: FormAction<Field>,
  fields: readonly Field[],
): FormAction<Field> {
  return async (previous, formData) => {
    try {
      return await action(previous, formData);
    } catch (error) {
      unstable_rethrow(error);
      return {
        formError:
          error instanceof TypeError ? offlineMessage : serverErrorMessage,
        values: stringValues(formData, fields),
      };
    }
  };
}

function stringValues<Field extends string>(
  formData: FormData,
  fields: readonly Field[],
): Partial<Record<Field, string>> {
  const values: Partial<Record<Field, string>> = {};
  for (const field of fields) {
    const value = formData.get(field);
    if (typeof value === "string") values[field] = value;
  }
  return values;
}
