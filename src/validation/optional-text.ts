import { z } from "zod";

// Trimmar texten och gör tom text eller saknat värde till null.
export function optionalText(max: number, tooLongMessage: string) {
  return z
    .string()
    .trim()
    .max(max, tooLongMessage)
    .nullish()
    .transform((value) => value || null);
}
