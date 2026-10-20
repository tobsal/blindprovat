import { and, asc, eq, max } from "drizzle-orm";
import {
  canAddWines,
  canOpenWines,
  canRevealWineDetails,
} from "@/domain/tasting";
import { db } from "./db";
import { withSafeErrors } from "./errors";
import { tastingOwnedBy } from "./ownership";
import type { SessionParticipant } from "./participants";
import type { RepositoryResult } from "./result";
import { tastings, wines } from "./schema";
import type { AdminWine } from "./tastings";

// Låsregel för alla skrivningar som beror på provningens status eller på om
// ett vin är öppet: lås provningsraden först, i en egen fråga, och läs sedan
// det som ska avgöra saken. Skrivare som ändrar statusen eller stänger ett
// vin tar exklusivt lås (FOR UPDATE eller UPDATE), betygsparare tar delat lås
// (FOR SHARE). Lås aldrig bara vinraden. Då tas locken alltid i samma
// ordning och ingen kan läsa ett gammalt värde efter att ha väntat på låset.

export type WineDetails = Pick<
  AdminWine,
  "name" | "producer" | "grape" | "region" | "country" | "vintage" | "price"
>;

// details är null tills provningen är avslöjad.
export type ParticipantWine = Pick<
  AdminWine,
  "id" | "blindNumber" | "isOpen"
> & {
  details: WineDetails | null;
};

export async function addWine(
  ownerId: string,
  tastingId: string,
  details: WineDetails,
): Promise<RepositoryResult<{ wine: AdminWine }>> {
  return withSafeErrors("addWine", () =>
    db.transaction(async (tx) => {
      // Låser provningen så att två samtidiga anrop inte får samma blindnummer.
      const [tasting] = await tx
        .select({ status: tastings.status })
        .from(tastings)
        .where(tastingOwnedBy(ownerId, tastingId))
        .for("update");
      if (!tasting) return { ok: false, error: "not_found" };
      if (!canAddWines(tasting.status)) {
        return { ok: false, error: "invalid_state" };
      }

      const [{ highest }] = await tx
        .select({ highest: max(wines.blindNumber) })
        .from(wines)
        .where(eq(wines.tastingId, tastingId));
      const [wine] = await tx
        .insert(wines)
        .values({ ...details, tastingId, blindNumber: (highest ?? 0) + 1 })
        .returning();
      return { ok: true, wine };
    }),
  );
}

export async function setWineOpen(
  ownerId: string,
  wineId: string,
  isOpen: boolean,
): Promise<RepositoryResult<{ wine: AdminWine }>> {
  return withSafeErrors("setWineOpen", () =>
    db.transaction(async (tx) => {
      // Samma ägarregel som tastingOwnedBy, men uppslaget går via vinet.
      const [found] = await tx
        .select({ status: tastings.status })
        .from(wines)
        .innerJoin(tastings, eq(wines.tastingId, tastings.id))
        .where(and(eq(wines.id, wineId), eq(tastings.ownerId, ownerId)))
        .for("update", { of: tastings });
      if (!found) return { ok: false, error: "not_found" };
      if (!canOpenWines(found.status)) {
        return { ok: false, error: "invalid_state" };
      }

      const [wine] = await tx
        .update(wines)
        .set({ isOpen })
        .where(eq(wines.id, wineId))
        .returning();
      return { ok: true, wine };
    }),
  );
}

const blindColumns = {
  id: wines.id,
  blindNumber: wines.blindNumber,
  isOpen: wines.isOpen,
};

const detailColumns = {
  name: wines.name,
  producer: wines.producer,
  grape: wines.grape,
  region: wines.region,
  country: wines.country,
  vintage: wines.vintage,
  price: wines.price,
};

// Vininformationen hämtas inte ens från databasen före avslöjandet.
// Statusen går bara framåt, så en samtidig ändring kan som värst dölja
// detaljerna en gång för mycket, aldrig visa dem för tidigt.
// Bara deltagarens egen provning går att läsa, via sessionen.
export async function listWinesForParticipant(
  participant: SessionParticipant,
): Promise<ParticipantWine[]> {
  return withSafeErrors("listWinesForParticipant", async () => {
    const { tastingId } = participant;
    const [tasting] = await db
      .select({ status: tastings.status })
      .from(tastings)
      .where(eq(tastings.id, tastingId));
    if (!tasting) return [];

    if (!canRevealWineDetails(tasting.status)) {
      const rows = await db
        .select(blindColumns)
        .from(wines)
        .where(eq(wines.tastingId, tastingId))
        .orderBy(asc(wines.blindNumber));
      return rows.map((row) => ({ ...row, details: null }));
    }

    const rows = await db
      .select({ ...blindColumns, ...detailColumns })
      .from(wines)
      .where(eq(wines.tastingId, tastingId))
      .orderBy(asc(wines.blindNumber));
    return rows.map(({ id, blindNumber, isOpen, ...details }) => ({
      id,
      blindNumber,
      isOpen,
      details,
    }));
  });
}
