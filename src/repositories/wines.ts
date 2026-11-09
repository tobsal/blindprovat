import { and, asc, eq, gt, lt, max, sql } from "drizzle-orm";
import {
  canEditWines,
  canOpenWines,
  canRateWines,
  canRevealWineDetails,
} from "@/domain/tasting";
import { db, type Db } from "./db";
import { withSafeErrors } from "./errors";
import { tastingOwnedBy } from "./ownership";
import type { SessionParticipant } from "./participants";
import type { RepositoryResult } from "./result";
import { tastings, wines } from "./schema";
import type { AdminWine } from "./tastings";

// Låsregel för alla skrivningar som beror på provningens status eller på om
// ett vin är öppet: lås provningsraden först, i en egen fråga, och läs sedan
// det som ska avgöra saken. Skrivare som ändrar statusen eller stänger ett
// vin tar exklusivt lås (FOR UPDATE eller UPDATE). Betygsparare och den som
// går med i provningen tar delat lås (FOR SHARE). Lås aldrig bara vinraden. Då tas locken alltid i samma
// ordning och ingen kan läsa ett gammalt värde efter att ha väntat på låset.

export type WineDetails = Pick<
  AdminWine,
  "name" | "producer" | "grape" | "region" | "country" | "vintage" | "price"
>;

export type NewWine = WineDetails & Pick<AdminWine, "type">;

// details är null tills provningen är avslöjad. Vintypen skickas redan före
// avslöjandet, eftersom den styr vilka smakklockor deltagaren fyller i.
// Det är ett medvetet undantag från blindheten: färgen syns ändå i glaset.
// isOpen betyder öppet för betyg: admin har öppnat vinet och provningen
// pågår. Ett vin som var öppet när provningen avslöjades räknas som stängt.
export type ParticipantWine = Pick<
  AdminWine,
  "id" | "blindNumber" | "isOpen" | "type"
> & {
  details: WineDetails | null;
};

export async function addWine(
  ownerId: string,
  tastingId: string,
  details: NewWine,
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
      if (!canEditWines(tasting.status)) {
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

type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Låser provningen som vinet tillhör, exklusivt enligt låsregeln ovan. Ett
// vin byter aldrig provning, så den kan slås upp utan lås. Ett vin i någon
// annans provning ger null, precis som ett som inte finns.
async function lockTastingOfWine(
  tx: Transaction,
  ownerId: string,
  wineId: string,
) {
  const [found] = await tx
    .select({ tastingId: wines.tastingId })
    .from(wines)
    .where(eq(wines.id, wineId));
  if (!found) return null;

  const [tasting] = await tx
    .select({ id: tastings.id, status: tastings.status })
    .from(tastings)
    .where(tastingOwnedBy(ownerId, found.tastingId))
    .for("update");
  return tasting ?? null;
}

export async function updateWine(
  ownerId: string,
  wineId: string,
  details: NewWine,
): Promise<RepositoryResult<{ wine: AdminWine }>> {
  return withSafeErrors("updateWine", () =>
    db.transaction(async (tx) => {
      const tasting = await lockTastingOfWine(tx, ownerId, wineId);
      if (!tasting) return { ok: false, error: "not_found" };
      if (!canEditWines(tasting.status)) {
        return { ok: false, error: "invalid_state" };
      }

      const [wine] = await tx
        .update(wines)
        .set(details)
        .where(eq(wines.id, wineId))
        .returning();
      // Vinet kan ha tagits bort medan vi väntade på låset.
      if (!wine) return { ok: false, error: "not_found" };
      return { ok: true, wine };
    }),
  );
}

// Vinerna efter det borttagna flyttas ner ett steg, så att blindnumren är
// 1, 2, 3 … utan luckor. Den unika regeln på (provning, blindnummer) prövas
// rad för rad, så numren flyttas via negativa tal för att inte krocka.
export async function deleteWine(
  ownerId: string,
  wineId: string,
): Promise<RepositoryResult<{ wine: AdminWine }>> {
  return withSafeErrors("deleteWine", () =>
    db.transaction(async (tx) => {
      const tasting = await lockTastingOfWine(tx, ownerId, wineId);
      if (!tasting) return { ok: false, error: "not_found" };
      if (!canEditWines(tasting.status)) {
        return { ok: false, error: "invalid_state" };
      }

      const [wine] = await tx
        .delete(wines)
        .where(eq(wines.id, wineId))
        .returning();
      if (!wine) return { ok: false, error: "not_found" };

      await tx
        .update(wines)
        .set({ blindNumber: sql`-(${wines.blindNumber} - 1)` })
        .where(
          and(
            eq(wines.tastingId, tasting.id),
            gt(wines.blindNumber, wine.blindNumber),
          ),
        );
      await tx
        .update(wines)
        .set({ blindNumber: sql`-${wines.blindNumber}` })
        .where(and(eq(wines.tastingId, tasting.id), lt(wines.blindNumber, 0)));
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
      const tasting = await lockTastingOfWine(tx, ownerId, wineId);
      if (!tasting) return { ok: false, error: "not_found" };
      if (!canOpenWines(tasting.status)) {
        return { ok: false, error: "invalid_state" };
      }

      const [wine] = await tx
        .update(wines)
        .set({ isOpen })
        .where(eq(wines.id, wineId))
        .returning();
      // Vinet kan ha tagits bort medan vi väntade på låset.
      if (!wine) return { ok: false, error: "not_found" };
      return { ok: true, wine };
    }),
  );
}

const blindColumns = {
  id: wines.id,
  blindNumber: wines.blindNumber,
  isOpen: wines.isOpen,
  type: wines.type,
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
    // Avslöjandet stänger inte vinerna i databasen, så statusen avgör också.
    const isRatable = canRateWines(tasting.status);

    if (!canRevealWineDetails(tasting.status)) {
      const rows = await db
        .select(blindColumns)
        .from(wines)
        .where(eq(wines.tastingId, tastingId))
        .orderBy(asc(wines.blindNumber));
      return rows.map((row) => ({
        ...row,
        isOpen: row.isOpen && isRatable,
        details: null,
      }));
    }

    const rows = await db
      .select({ ...blindColumns, ...detailColumns })
      .from(wines)
      .where(eq(wines.tastingId, tastingId))
      .orderBy(asc(wines.blindNumber));
    return rows.map(({ id, blindNumber, isOpen, type, ...details }) => ({
      id,
      blindNumber,
      isOpen: isOpen && isRatable,
      type,
      details,
    }));
  });
}
