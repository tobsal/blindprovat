import { afterAll, describe, expect, it } from "vitest";
import { createLiveTasting, createTestOwners } from "@/test-support/fixtures";
import { unwrap } from "@/test-support/unwrap";
import { joinTasting } from "./participants";
import { listOwnRatings, saveRating, type RatingValues } from "./ratings";
import { advanceTastingStatus } from "./tastings";
import { setWineOpen } from "./wines";

const owners = createTestOwners();
afterAll(() => owners.cleanUp());

// Varje varv skapar en egen provning, så det tar några sekunder mot en
// fjärrdatabas.
const ITERATIONS = 20;
const TEST_TIMEOUT_MS = 60_000;

const values: RatingValues = { score: 7, note: null, tags: [], guess: null };

async function createLiveTastingWithTwoParticipants() {
  const live = await createLiveTasting(owners);
  const second = unwrap(
    await joinTasting({ code: live.tasting.code, displayName: "Alva" }),
    "Kunde inte gå med",
  );
  return { ...live, participants: [live.participant, second.participant] };
}

// Kör två betyg samtidigt med en ändring som kräver exklusivt lås. Alla anrop
// ska gå igenom utan databasfel (till exempel deadlock), varje betyg ska
// antingen sparas eller nekas som ogiltigt tillstånd, och det som sparats ska
// stämma med vad anropet svarade.
type LiveIds = { ownerId: string; tastingId: string; wineId: string };

async function raceRatingsAgainst(
  change: (live: LiveIds) => Promise<{ ok: boolean }>,
) {
  for (let i = 0; i < ITERATIONS; i++) {
    const { ownerId, tasting, participants, openWineId } =
      await createLiveTastingWithTwoParticipants();

    const outcomes = await Promise.allSettled([
      saveRating(participants[0], openWineId, values),
      saveRating(participants[1], openWineId, values),
      change({ ownerId, tastingId: tasting.id, wineId: openWineId }),
    ]);

    const [first, second, changed] = outcomes;
    if (first.status !== "fulfilled" || second.status !== "fulfilled") {
      throw new Error(
        `saveRating kastade i varv ${i}: ${JSON.stringify(outcomes)}`,
      );
    }
    if (changed.status !== "fulfilled") {
      throw new Error(
        `Ändringen kastade i varv ${i}: ${String(changed.reason)}`,
      );
    }
    expect(changed.value.ok).toBe(true);

    for (const [index, result] of [first.value, second.value].entries()) {
      expect(result.ok || result.error === "invalid_state").toBe(true);
      const saved = await listOwnRatings(participants[index]);
      expect(saved).toHaveLength(result.ok ? 1 : 0);
    }
  }
}

describe("samtidiga skrivningar", () => {
  it(
    "klarar betyg samtidigt som vinet stängs",
    () =>
      raceRatingsAgainst(({ ownerId, wineId }) =>
        setWineOpen(ownerId, wineId, false),
      ),
    TEST_TIMEOUT_MS,
  );

  it(
    "klarar betyg samtidigt som provningen avslöjas",
    () =>
      raceRatingsAgainst(({ ownerId, tastingId }) =>
        advanceTastingStatus(ownerId, tastingId),
      ),
    TEST_TIMEOUT_MS,
  );

  // Två deltagare går med samtidigt som provningen avslöjas. Ingen får ett
  // databasfel, och var och en släpps antingen in eller nekas.
  it(
    "klarar deltagare som går med samtidigt som provningen avslöjas",
    async () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const { ownerId, tasting } = await createLiveTasting(owners);

        const outcomes = await Promise.allSettled([
          joinTasting({ code: tasting.code, displayName: "Alva" }),
          joinTasting({ code: tasting.code, displayName: "Bo" }),
          advanceTastingStatus(ownerId, tasting.id),
        ]);

        const [first, second, revealed] = outcomes;
        if (
          first.status !== "fulfilled" ||
          second.status !== "fulfilled" ||
          revealed.status !== "fulfilled"
        ) {
          throw new Error(
            `Ett anrop kastade i varv ${i}: ${JSON.stringify(outcomes)}`,
          );
        }
        expect(revealed.value.ok).toBe(true);
        for (const joined of [first.value, second.value]) {
          expect(joined.ok || joined.error === "not_found").toBe(true);
        }
      }
    },
    TEST_TIMEOUT_MS,
  );
});
