import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "./db";
import { findParticipantBySessionToken, joinTasting } from "./participants";
import { participants } from "./schema";
import { advanceTastingStatus, createTasting } from "./tastings";
import { createTestOwners } from "./test-fixtures";

const owners = createTestOwners();
afterAll(() => owners.cleanUp());

async function createTestTasting() {
  return createTasting(owners.createOwnerId(), { name: "Deltagare" });
}

describe("deltagare", () => {
  it("går med via kod och hittas igen via sin sessionstoken", async () => {
    const tasting = await createTestTasting();
    const joined = await joinTasting({ code: tasting.code, displayName: "Kim" });
    if (!joined.ok) throw new Error("Kunde inte gå med");

    expect(joined.participant).toEqual({
      id: expect.any(String),
      tastingId: tasting.id,
      displayName: "Kim",
    });
    expect(await findParticipantBySessionToken(joined.sessionToken)).toEqual(
      joined.participant,
    );
  });

  it("lagrar bara en hash av sessionstoken", async () => {
    const tasting = await createTestTasting();
    const joined = await joinTasting({ code: tasting.code, displayName: "Kim" });
    if (!joined.ok) throw new Error("Kunde inte gå med");

    const [stored] = await db
      .select({ sessionTokenHash: participants.sessionTokenHash })
      .from(participants)
      .where(eq(participants.id, joined.participant.id));
    expect(stored.sessionTokenHash).not.toBe(joined.sessionToken);
    expect(stored.sessionTokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("nekar ett namn som redan finns i provningen, oavsett skiftläge", async () => {
    const tasting = await createTestTasting();
    await joinTasting({ code: tasting.code, displayName: "Kim" });

    expect(await joinTasting({ code: tasting.code, displayName: "kim" })).toEqual(
      { ok: false, error: "name_taken" },
    );
    const otherTasting = await createTestTasting();
    const inOther = await joinTasting({
      code: otherTasting.code,
      displayName: "Kim",
    });
    expect(inOther.ok).toBe(true);
  });

  it("ger samma svar för okänd kod som för avslöjad provning", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Avslöjad" });
    await advanceTastingStatus(ownerId, tasting.id);
    await advanceTastingStatus(ownerId, tasting.id);

    const notFound = { ok: false, error: "not_found" };
    expect(
      await joinTasting({ code: tasting.code, displayName: "Kim" }),
    ).toEqual(notFound);
    expect(
      await joinTasting({ code: "ZZZZZZZZZZ", displayName: "Kim" }),
    ).toEqual(notFound);
  });

  it("hittar ingen deltagare för okänd token", async () => {
    expect(await findParticipantBySessionToken("okänd")).toBeNull();
  });
});
