import { afterAll, describe, expect, it } from "vitest";
import { TASTING_CODE_ALPHABET, TASTING_CODE_LENGTH } from "@/domain/tasting";
import {
  advanceTastingStatus,
  createTasting,
  findTastingForParticipant,
  getTastingForOwner,
  listTastingsForOwner,
} from "./tastings";
import { createTestOwners, sampleWine } from "./test-fixtures";
import { addWine, listWinesForParticipant, setWineOpen } from "./wines";

const owners = createTestOwners();
afterAll(() => owners.cleanUp());

describe("provningar", () => {
  it("skapar en provning i draft med slumpad kod", async () => {
    const tasting = await createTasting(owners.createOwnerId(), {
      name: "Italienskt",
    });
    expect(tasting.status).toBe("draft");
    expect(tasting.code).toMatch(
      new RegExp(`^[${TASTING_CODE_ALPHABET}]{${TASTING_CODE_LENGTH}}$`),
    );
  });

  it("visar bara ägarens egna provningar", async () => {
    const ownerId = owners.createOwnerId();
    const otherOwnerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Min" });
    await createTasting(otherOwnerId, { name: "Någon annans" });

    expect(
      (await listTastingsForOwner(ownerId)).map((own) => own.id),
    ).toEqual([tasting.id]);
    expect(await getTastingForOwner(otherOwnerId, tasting.id)).toBeNull();
    expect(await advanceTastingStatus(otherOwnerId, tasting.id)).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await addWine(otherOwnerId, tasting.id, sampleWine)).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("flyttar statusen bara framåt", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Status" });

    const toLive = await advanceTastingStatus(ownerId, tasting.id);
    expect(toLive.ok && toLive.tasting.status).toBe("live");
    const toRevealed = await advanceTastingStatus(ownerId, tasting.id);
    expect(toRevealed.ok && toRevealed.tasting.status).toBe("revealed");
    expect(await advanceTastingStatus(ownerId, tasting.id)).toEqual({
      ok: false,
      error: "invalid_state",
    });
  });

  it("ger deltagare bara id, namn och status", async () => {
    const tasting = await createTasting(owners.createOwnerId(), {
      name: "Deltagarvy",
    });
    expect(await findTastingForParticipant(tasting.id)).toEqual({
      id: tasting.id,
      name: "Deltagarvy",
      status: "draft",
    });
  });
});

describe("viner", () => {
  it("numrerar vinerna i tur och ordning och bara i draft", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Numrering" });
    await addWine(ownerId, tasting.id, sampleWine);
    await addWine(ownerId, tasting.id, { ...sampleWine, name: "Chianti" });

    const loaded = await getTastingForOwner(ownerId, tasting.id);
    expect(loaded?.wines.map((wine) => wine.blindNumber)).toEqual([1, 2]);

    await advanceTastingStatus(ownerId, tasting.id);
    expect(await addWine(ownerId, tasting.id, sampleWine)).toEqual({
      ok: false,
      error: "invalid_state",
    });
  });

  it("öppnar och stänger viner bara medan provningen pågår", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Öppna" });
    const added = await addWine(ownerId, tasting.id, sampleWine);
    if (!added.ok) throw new Error("Kunde inte lägga till vin");

    expect(await setWineOpen(ownerId, added.wine.id, true)).toEqual({
      ok: false,
      error: "invalid_state",
    });
    await advanceTastingStatus(ownerId, tasting.id);
    const opened = await setWineOpen(ownerId, added.wine.id, true);
    expect(opened.ok && opened.wine.isOpen).toBe(true);
    expect(
      await setWineOpen(owners.createOwnerId(), added.wine.id, false),
    ).toEqual({ ok: false, error: "not_found" });
  });

  it("skickar ingen vininformation till deltagare före avslöjandet", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Blint" });
    await addWine(ownerId, tasting.id, sampleWine);

    for (const step of ["draft", "live"]) {
      const blind = await listWinesForParticipant(tasting.id);
      expect(blind, step).toEqual([
        { id: expect.any(String), blindNumber: 1, isOpen: false, details: null },
      ]);
      expect(JSON.stringify(blind)).not.toContain("Vietti");
      await advanceTastingStatus(ownerId, tasting.id);
    }

    const revealed = await listWinesForParticipant(tasting.id);
    expect(revealed[0].details).toEqual(sampleWine);
  });
});
