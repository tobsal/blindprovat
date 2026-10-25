import { randomBytes } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  formatTastingCode,
  nextTastingStatus,
  TASTING_CODE_LENGTH,
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

export async function advanceTastingStatus(
  ownerId: string,
  tastingId: string,
): Promise<RepositoryResult<{ tasting: AdminTasting }>> {
  return withSafeErrors("advanceTastingStatus", async () => {
    const ownedTasting = tastingOwnedBy(ownerId, tastingId);
    const [current] = await db
      .select({ status: tastings.status })
      .from(tastings)
      .where(ownedTasting);
    if (!current) return { ok: false, error: "not_found" };

    const next = nextTastingStatus(current.status);
    if (!next) return { ok: false, error: "invalid_state" };

    // Villkoret på nuvarande status hindrar att två samtidiga anrop hoppar
    // över ett steg.
    const [tasting] = await db
      .update(tastings)
      .set({ status: next })
      .where(and(ownedTasting, eq(tastings.status, current.status)))
      .returning();
    return tasting
      ? { ok: true, tasting }
      : { ok: false, error: "invalid_state" };
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
