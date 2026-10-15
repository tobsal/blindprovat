import { and, asc, eq, max } from "drizzle-orm";
import { db } from "./db";
import { tastings, wines } from "./schema";
import type { AdminWine } from "./tastings";

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

export type AddWineResult =
  | { ok: true; wine: AdminWine }
  | { ok: false; error: "not_found" | "invalid_state" };

export async function addWine(
  ownerId: string,
  tastingId: string,
  details: WineDetails,
): Promise<AddWineResult> {
  return db.transaction(async (tx) => {
    // Låser provningen så att två samtidiga anrop inte får samma blindnummer.
    const [tasting] = await tx
      .select({ status: tastings.status })
      .from(tastings)
      .where(and(eq(tastings.id, tastingId), eq(tastings.ownerId, ownerId)))
      .for("update");
    if (!tasting) return { ok: false, error: "not_found" };
    if (tasting.status !== "draft") return { ok: false, error: "invalid_state" };

    const [{ highest }] = await tx
      .select({ highest: max(wines.blindNumber) })
      .from(wines)
      .where(eq(wines.tastingId, tastingId));
    const [wine] = await tx
      .insert(wines)
      .values({ ...details, tastingId, blindNumber: (highest ?? 0) + 1 })
      .returning();
    return { ok: true, wine };
  });
}

export type SetWineOpenResult =
  | { ok: true; wine: AdminWine }
  | { ok: false; error: "not_found" | "invalid_state" };

export async function setWineOpen(
  ownerId: string,
  wineId: string,
  isOpen: boolean,
): Promise<SetWineOpenResult> {
  const [found] = await db
    .select({ status: tastings.status })
    .from(wines)
    .innerJoin(tastings, eq(wines.tastingId, tastings.id))
    .where(and(eq(wines.id, wineId), eq(tastings.ownerId, ownerId)));
  if (!found) return { ok: false, error: "not_found" };
  if (found.status !== "live") return { ok: false, error: "invalid_state" };

  const [wine] = await db
    .update(wines)
    .set({ isOpen })
    .where(eq(wines.id, wineId))
    .returning();
  return { ok: true, wine };
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
export async function listWinesForParticipant(
  tastingId: string,
): Promise<ParticipantWine[]> {
  const [tasting] = await db
    .select({ status: tastings.status })
    .from(tastings)
    .where(eq(tastings.id, tastingId));
  if (!tasting) return [];

  if (tasting.status !== "revealed") {
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
}
