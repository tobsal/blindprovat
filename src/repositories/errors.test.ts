import { inspect } from "node:util";
import { DrizzleQueryError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { DatabaseError, isUniqueViolation, withSafeErrors } from "./errors";

// Drizzles fel har parametrarna i meddelandet, och drivrutinens fel har
// värdet i detail. Båda ska vara borta ur det fel som kastas vidare.
function queryErrorWithSecrets() {
  const postgresError = Object.assign(new Error("duplicate key value"), {
    code: "23505",
    constraint_name: "tastings_code_key",
    detail: "Key (code)=(HEMLIGKOD9) already exists.",
  });
  return new DrizzleQueryError(
    "insert into tastings values ($1, $2)",
    ["Hemligt vin", "HEMLIGKOD9"],
    postgresError,
  );
}

async function caughtFrom(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error("Förväntade ett fel");
}

describe("withSafeErrors", () => {
  it("ger tillbaka resultatet när inget fel uppstår", async () => {
    expect(await withSafeErrors("test", async () => 42)).toBe(42);
  });

  it("tar bort parametrar och värden ur databasfel", async () => {
    const error = await caughtFrom(() =>
      withSafeErrors("createTasting", async () => {
        throw queryErrorWithSecrets();
      }),
    );

    expect(error).toBeInstanceOf(DatabaseError);
    const logged = inspect(error, { depth: Infinity });
    expect(logged).not.toContain("Hemligt vin");
    expect(logged).not.toContain("HEMLIGKOD9");
    expect(logged).toContain("createTasting");
    expect(logged).toContain("23505");
  });

  it("behåller felkod och constraint, så att unika krockar känns igen", async () => {
    const error = await caughtFrom(() =>
      withSafeErrors("createTasting", async () => {
        throw queryErrorWithSecrets();
      }),
    );
    expect(isUniqueViolation(error, "tastings_code_key")).toBe(true);
  });

  it("ersätter anslutningsfel från drivrutinen", async () => {
    const connectionError = Object.assign(new Error("connect failed"), {
      code: "ECONNREFUSED",
    });
    const error = await caughtFrom(() =>
      withSafeErrors("listTastingsForOwner", async () => {
        throw connectionError;
      }),
    );
    expect(error).toBeInstanceOf(DatabaseError);
    expect((error as DatabaseError).code).toBe("ECONNREFUSED");
  });

  it("släpper igenom fel som inte kommer från databasen", async () => {
    const programmingError = new TypeError("x is undefined");
    const error = await caughtFrom(() =>
      withSafeErrors("addWine", async () => {
        throw programmingError;
      }),
    );
    expect(error).toBe(programmingError);
  });
});
