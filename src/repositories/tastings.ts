import { randomBytes } from "node:crypto";
import { asc, count, desc, eq } from "drizzle-orm";
import {
  canAdvanceTasting,
  formatTastingCode,
  nextTastingStatus,
  TASTING_CODE_LENGTH,
  type TastingStatus,
} from "@/domain/tasting";
import { db } from "./db";
import { isUniqueViolation, withSafeErrors } from "./errors";
import { tastingOwnedBy } from "./ownership";
import type { SessionParticipant } from "./participants";
import type { RepositoryResult } from "./result";
import { constraintNames, tastings, wines } from "./schema";

export type AdminTasting = typeof tastings.$inferSelect;
export type AdminWine = typeof wines.$inferSelect;
export type AdminTastingWithWines = AdminTasting & { wines: AdminWine[] };

// Det enda deltagare får veta om själva provningen.
export type ParticipantTasting = Pick<AdminTasting, "id" | "name" | "status">;

// Med 50 bitars slump är en krock osannolik, men koden måste vara unik.
const MAX_CODE_ATTEMPTS = 5;

function generateTastingCode(): string {
  return formatTastingCode(randomBytes(TASTING_CODE_LENGTH));
}

export async function createTasting(
  ownerId: string,
  input: { name: string },
): Promise<AdminTasting> {
  return withSafeErrors("createTasting", async () => {
    for (let attempt = 1; ; attempt++) {
      try {
        const [tasting] = await db
          .insert(tastings)
          .values({ ownerId, name: input.name, code: generateTastingCode() })
          .returning();
        return tasting;
      } catch (error) {
        if (
          attempt < MAX_CODE_ATTEMPTS &&
          isUniqueViolation(error, constraintNames.tastingCodeUnique)
        ) {
          continue;
        }
        throw error;
      }
    }
  });
}

export async function listTastingsForOwner(
  ownerId: string,
): Promise<AdminTasting[]> {
  return withSafeErrors("listTastingsForOwner", () =>
    db
      .select()
      .from(tastings)
      .where(eq(tastings.ownerId, ownerId))
      .orderBy(desc(tastings.createdAt)),
  );
}

// En provning som någon annan äger ger null, precis som en som inte finns.
export async function getTastingForOwner(
  ownerId: string,
  tastingId: string,
): Promise<AdminTastingWithWines | null> {
  return withSafeErrors("getTastingForOwner", async () => {
    const [tasting] = await db
      .select()
      .from(tastings)
      .where(tastingOwnedBy(ownerId, tastingId));
    if (!tasting) return null;

    const tastingWines = await db
      .select()
      .from(wines)
      .where(eq(wines.tastingId, tastingId))
      .orderBy(asc(wines.blindNumber));
    return { ...tasting, wines: tastingWines };
  });
}

// Anroparen anger statusen den utgår från. Ett dubbelklick eller en gammal
// flik kan då inte hoppa över ett steg och avslöja provningen av misstag.
export async function advanceTastingStatus(
  ownerId: string,
  tastingId: string,
  from: TastingStatus,
): Promise<RepositoryResult<{ tasting: AdminTasting }>> {
  return withSafeErrors("advanceTastingStatus", () =>
    db.transaction(async (tx) => {
      // Exklusivt lås på provningen enligt låsregeln i wines.ts. addWine tar
      // samma lås, så antalet viner kan inte ändras före skrivningen.
      const [current] = await tx
        .select({ status: tastings.status })
        .from(tastings)
        .where(tastingOwnedBy(ownerId, tastingId))
        .for("update");
      if (!current) return { ok: false, error: "not_found" };

      const next = nextTastingStatus(from);
      if (current.status !== from || !next) {
        return { ok: false, error: "invalid_state" };
      }

      const [{ wineCount }] = await tx
        .select({ wineCount: count() })
        .from(wines)
        .where(eq(wines.tastingId, tastingId));
      if (!canAdvanceTasting(from, wineCount)) {
        return { ok: false, error: "invalid_state" };
      }

      const [tasting] = await tx
        .update(tastings)
        .set({ status: next })
        .where(eq(tastings.id, tastingId))
        .returning();
      return { ok: true, tasting };
    }),
  );
}

// Viner, deltagare och betyg tas bort med provningen (cascade i schemat).
// DELETE tar exklusivt lås på provningsraden och väntar därför ut den som
// håller delat lås enligt låsregeln i wines.ts, till exempel en betygsparare.
// Provningen kan tas bort oavsett status.
export async function deleteTasting(
  ownerId: string,
  tastingId: string,
): Promise<RepositoryResult<object>> {
  return withSafeErrors("deleteTasting", async () => {
    const [deleted] = await db
      .delete(tastings)
      .where(tastingOwnedBy(ownerId, tastingId))
      .returning({ id: tastings.id });
    return deleted ? { ok: true } : { ok: false, error: "not_found" };
  });
}

// Deltagaren får bara se sin egen provning, så den slås upp via sessionen
// och inte via ett id som kommer utifrån.
export async function findTastingForParticipant(
  participant: SessionParticipant,
): Promise<ParticipantTasting | null> {
  return withSafeErrors("findTastingForParticipant", async () => {
    const [tasting] = await db
      .select({ id: tastings.id, name: tastings.name, status: tastings.status })
      .from(tastings)
      .where(eq(tastings.id, participant.tastingId));
    return tasting ?? null;
  });
}
