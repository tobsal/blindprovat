import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db } from "@/repositories/db";
import { joinTasting } from "@/repositories/participants";
import { tastings } from "@/repositories/schema";
import { advanceTastingStatus, createTasting } from "@/repositories/tastings";
import { addWine, setWineOpen, type WineDetails } from "@/repositories/wines";
import { unwrap } from "./unwrap";

// Används bara av databastesterna (*.db.test.ts) och e2e-testerna.

export const sampleWine: WineDetails = {
  name: "Barolo Castiglione",
  producer: "Vietti",
  grape: "Nebbiolo",
  region: "Piemonte",
  country: "Italien",
  vintage: 2019,
  price: 450,
};

// Varje test får egna ägare och städar bara bort deras provningar, så
// testerna rör aldrig annan data i databasen. Cascade tar viner, deltagare
// och betyg.
export function createTestOwners() {
  const ownerIds: string[] = [];
  return {
    createOwnerId(): string {
      const ownerId = `test-owner-${randomUUID()}`;
      ownerIds.push(ownerId);
      return ownerId;
    },
    async cleanUp(): Promise<void> {
      if (ownerIds.length > 0) {
        await db.delete(tastings).where(inArray(tastings.ownerId, ownerIds));
      }
      await db.$client.end();
    },
  };
}

export type TestOwners = ReturnType<typeof createTestOwners>;

// En pågående provning med ett öppet och ett stängt vin och en deltagare.
export async function createLiveTasting(owners: TestOwners) {
  const ownerId = owners.createOwnerId();
  const tasting = await createTasting(ownerId, { name: "Betyg" });
  const openWine = unwrap(
    await addWine(ownerId, tasting.id, sampleWine),
    "Kunde inte lägga till vin",
  );
  const closedWine = unwrap(
    await addWine(ownerId, tasting.id, sampleWine),
    "Kunde inte lägga till vin",
  );
  await advanceTastingStatus(ownerId, tasting.id);
  await setWineOpen(ownerId, openWine.wine.id, true);
  const joined = unwrap(
    await joinTasting({ code: tasting.code, displayName: "Kim" }),
    "Kunde inte gå med",
  );
  return {
    ownerId,
    tasting,
    participant: joined.participant,
    openWineId: openWine.wine.id,
    closedWineId: closedWine.wine.id,
  };
}
