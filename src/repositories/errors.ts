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
