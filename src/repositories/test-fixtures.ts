import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db } from "./db";
import { tastings } from "./schema";
import type { WineDetails } from "./wines";

// Används bara av databastesterna (*.db.test.ts).

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
