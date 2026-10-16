import { z } from "zod";

export type LoginError = "AccessDenied" | "other";

const accessDeniedSchema = z.literal("AccessDenied");

// Auth.js skickar tillbaka en felkod i ?error=. Bara den vi har en egen text
// för släpps igenom, allt annat blir ett allmänt fel. Ingen kod → inget fel.
export function parseLoginError(value: unknown): LoginError | null {
  if (value === undefined) return null;
  return accessDeniedSchema.safeParse(value).success ? "AccessDenied" : "other";
}
