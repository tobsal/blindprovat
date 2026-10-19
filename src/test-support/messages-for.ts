import type { ZodType } from "zod";

// Felmeddelandena från ett schema, eller en tom lista om indata är giltig.
export function messagesFor(schema: ZodType, input: unknown): string[] {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}
