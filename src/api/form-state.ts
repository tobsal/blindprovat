// Det som skrevs in skickas tillbaka, så att formuläret kan visa det igen
// när något gick fel.
export type FormState<Field extends string> = {
  fieldErrors?: Partial<Record<Field, string[]>>;
  formError?: string;
  values?: Partial<Record<Field, string>>;
  message?: string;
};

export function formValues<Field extends string>(
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
