import { DrizzleQueryError } from "drizzle-orm";

// Postgres felkod för brott mot unik-constraint.
const UNIQUE_VIOLATION = "23505";

type PostgresErrorFields = { code?: unknown; constraint_name?: unknown };

// Drizzle slår in drivrutinens fel, så både felet och dess orsak kontrolleras.
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const cause =
    typeof error === "object" && error !== null && "cause" in error
      ? error.cause
      : undefined;
  return [error, cause].some((candidate) => {
    if (typeof candidate !== "object" || candidate === null) return false;
    const fields = candidate as PostgresErrorFields;
    return (
      fields.code === UNIQUE_VIOLATION && fields.constraint_name === constraint
    );
  });
}

// Ett databasfel som är säkert att logga. Drizzle lägger frågans parametrar i
// felmeddelandet och Postgres lägger värden i detail ("Key (code)=(…)",
// "Failing row contains (…)"). Next.js loggar båda, och parametrarna kan vara
// vininformation, anteckningar eller provningskoder (princip 14). Det här
// felet har bara vad som försöktes, felkoden och constrainten, ingen orsak.
// Fälten heter som i Postgres fel så att isUniqueViolation fungerar på det.
export class DatabaseError extends Error {
  readonly code: string;
  readonly constraint_name: string | undefined;

  constructor(operation: string, code: string, constraintName?: string) {
    const constraint = constraintName ? `, constraint ${constraintName}` : "";
    super(`${operation} misslyckades i databasen (kod ${code}${constraint})`);
    this.name = "DatabaseError";
    this.code = code;
    this.constraint_name = constraintName;
  }
}

// Fel från databasen (Drizzle, Postgres eller anslutningen) har en felkod.
// Andra fel, till exempel programmeringsfel, innehåller inga parametrar och
// släpps igenom med sin stacktrace.
function toSafeError(operation: string, error: unknown): unknown {
  const isQueryError = error instanceof DrizzleQueryError;
  const source = isQueryError ? error.cause : error;
  const { code, constraint_name } = (
    typeof source === "object" && source !== null ? source : {}
  ) as PostgresErrorFields;
  if (!isQueryError && typeof code !== "string") return error;
  return new DatabaseError(
    operation,
    typeof code === "string" ? code : "okänd",
    typeof constraint_name === "string" ? constraint_name : undefined,
  );
}

// Varje exporterad funktion i dataåtkomstlagret körs genom den här, så att
// inget databasfel når loggen med parametrar eller värden.
export async function withSafeErrors<T>(
  operation: string,
  run: () => PromiseLike<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw toSafeError(operation, error);
  }
}
