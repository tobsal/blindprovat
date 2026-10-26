import type { FormState } from "@/api/form-state";

export const offlineMessage =
  "Ingen uppkoppling. Det du skrivit finns kvar. Försök igen när du är uppkopplad.";

type FormAction<Field extends string> = (
  previous: FormState<Field>,
  formData: FormData,
) => Promise<FormState<Field>>;

// Utan uppkoppling avvisar fetch anropet med ett TypeError. Serverfel och
// omdirigeringar är andra fel och kastas vidare, så att error.tsx och
// redirect fungerar som vanligt (princip 14).
export function keepInputWhenOffline<Field extends string>(
  action: FormAction<Field>,
  fields: readonly Field[],
): FormAction<Field> {
  return async (previous, formData) => {
    try {
      return await action(previous, formData);
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      return { formError: offlineMessage, values: stringValues(formData, fields) };
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
