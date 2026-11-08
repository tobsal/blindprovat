import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { TASTING_CODE_ALPHABET, TASTING_CODE_LENGTH } from "@/domain/tasting";
import {
  createLiveTasting,
  createTestOwners,
  noTasteClocks,
  sampleWine,
} from "@/test-support/fixtures";
import { unwrap } from "@/test-support/unwrap";
import { db } from "./db";
import { isUniqueViolation } from "./errors";
import { joinTasting } from "./participants";
import { listOwnRatings, saveRating } from "./ratings";
import { constraintNames, participants, tastings } from "./schema";
import {
  advanceTastingStatus,
  createTasting,
  deleteTasting,
  findTastingForParticipant,
  getTastingForOwner,
  listTastingsForOwner,
} from "./tastings";
import {
  addWine,
  deleteWine,
  listWinesForParticipant,
  setWineOpen,
  updateWine,
} from "./wines";

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

  it("känner igen ett brott mot den unika provningskoden", async () => {
    const ownerId = owners.createOwnerId();
    const code = `test-${randomUUID()}`;
    await db.insert(tastings).values({ ownerId, name: "Första", code });

    const error = await db
      .insert(tastings)
      .values({ ownerId, name: "Andra", code })
      .then(
        () => null,
        (rejection: unknown) => rejection,
      );
    expect(isUniqueViolation(error, constraintNames.tastingCodeUnique)).toBe(
      true,
    );
  });

  it("visar bara ägarens egna provningar", async () => {
    const ownerId = owners.createOwnerId();
    const otherOwnerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Min" });
    await createTasting(otherOwnerId, { name: "Någon annans" });

    expect((await listTastingsForOwner(ownerId)).map((own) => own.id)).toEqual([
      tasting.id,
    ]);
    expect(await getTastingForOwner(otherOwnerId, tasting.id)).toBeNull();
    expect(
      await advanceTastingStatus(otherOwnerId, tasting.id, "draft"),
    ).toEqual({
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
    await addWine(ownerId, tasting.id, sampleWine);

    const toLive = await advanceTastingStatus(ownerId, tasting.id, "draft");
    expect(toLive.ok && toLive.tasting.status).toBe("live");
    const toRevealed = await advanceTastingStatus(ownerId, tasting.id, "live");
    expect(toRevealed.ok && toRevealed.tasting.status).toBe("revealed");
    expect(await advanceTastingStatus(ownerId, tasting.id, "revealed")).toEqual(
      { ok: false, error: "invalid_state" },
    );
  });

  it("hoppar inte över ett steg när samma start skickas två gånger", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Dubbelklick" });
    await addWine(ownerId, tasting.id, sampleWine);

    const [first, second] = await Promise.all([
      advanceTastingStatus(ownerId, tasting.id, "draft"),
      advanceTastingStatus(ownerId, tasting.id, "draft"),
    ]);
    expect([first.ok, second.ok].sort()).toEqual([false, true]);
    expect((await getTastingForOwner(ownerId, tasting.id))?.status).toBe(
      "live",
    );
  });

  it("startar inte en provning utan viner", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Tom" });
    expect(await advanceTastingStatus(ownerId, tasting.id, "draft")).toEqual({
      ok: false,
      error: "invalid_state",
    });
  });

  it("ger deltagare bara id, namn och status", async () => {
    const tasting = await createTasting(owners.createOwnerId(), {
      name: "Deltagarvy",
    });
    const { participant } = unwrap(
      await joinTasting({ code: tasting.code, displayName: "Kim" }),
      "Kunde inte gå med",
    );
    expect(await findTastingForParticipant(participant)).toEqual({
      id: tasting.id,
      name: "Deltagarvy",
      status: "draft",
    });
  });
});

describe("borttagning av provning", () => {
  it("tar bort provningen med viner, deltagare och betyg", async () => {
    const { ownerId, tasting, participant, openWineId } =
      await createLiveTasting(owners);
    unwrap(
      await saveRating(participant, openWineId, {
        score: 7,
        note: null,
        tags: [],
        guess: null,
        ...noTasteClocks,
      }),
      "Kunde inte spara betyg",
    );

    expect(await deleteTasting(ownerId, tasting.id)).toEqual({ ok: true });

    expect(await getTastingForOwner(ownerId, tasting.id)).toBeNull();
    expect(await listTastingsForOwner(ownerId)).toEqual([]);
    expect(await findTastingForParticipant(participant)).toBeNull();
    expect(await listWinesForParticipant(participant)).toEqual([]);
    expect(await listOwnRatings(participant)).toEqual([]);
    expect(
      await db
        .select()
        .from(participants)
        .where(eq(participants.id, participant.id)),
    ).toEqual([]);
  });

  it("tar inte bort någon annans provning", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Min" });

    expect(await deleteTasting(owners.createOwnerId(), tasting.id)).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await getTastingForOwner(ownerId, tasting.id)).not.toBeNull();
  });

  it("ger not_found när provningen redan är borttagen", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Två gånger" });

    await deleteTasting(ownerId, tasting.id);
    expect(await deleteTasting(ownerId, tasting.id)).toEqual({
      ok: false,
      error: "not_found",
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

    await advanceTastingStatus(ownerId, tasting.id, "draft");
    expect(await addWine(ownerId, tasting.id, sampleWine)).toEqual({
      ok: false,
      error: "invalid_state",
    });
  });

  it("öppnar och stänger viner bara medan provningen pågår", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Öppna" });
    const added = unwrap(
      await addWine(ownerId, tasting.id, sampleWine),
      "Kunde inte lägga till vin",
    );

    expect(await setWineOpen(ownerId, added.wine.id, true)).toEqual({
      ok: false,
      error: "invalid_state",
    });
    await advanceTastingStatus(ownerId, tasting.id, "draft");
    const opened = await setWineOpen(ownerId, added.wine.id, true);
    expect(opened.ok && opened.wine.isOpen).toBe(true);
    expect(
      await setWineOpen(owners.createOwnerId(), added.wine.id, false),
    ).toEqual({ ok: false, error: "not_found" });
  });

  it("ändrar ett vin bara i draft och bara i ägarens provning", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Ändra" });
    const added = unwrap(
      await addWine(ownerId, tasting.id, sampleWine),
      "Kunde inte lägga till vin",
    );
    const changes = { ...sampleWine, name: "Barbaresco", vintage: null };

    expect(
      await updateWine(owners.createOwnerId(), added.wine.id, changes),
    ).toEqual({ ok: false, error: "not_found" });

    const updated = await updateWine(ownerId, added.wine.id, changes);
    expect(updated.ok && updated.wine).toMatchObject({
      ...changes,
      blindNumber: 1,
    });

    await advanceTastingStatus(ownerId, tasting.id, "draft");
    expect(await updateWine(ownerId, added.wine.id, sampleWine)).toEqual({
      ok: false,
      error: "invalid_state",
    });
    const loaded = await getTastingForOwner(ownerId, tasting.id);
    expect(loaded?.wines[0].name).toBe("Barbaresco");
  });

  it("numrerar om vinerna när ett tas bort", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Ta bort vin" });
    const added = [];
    for (const name of ["Ett", "Två", "Tre", "Fyra"]) {
      added.push(
        unwrap(
          await addWine(ownerId, tasting.id, { ...sampleWine, name }),
          "Kunde inte lägga till vin",
        ).wine,
      );
    }

    expect(await deleteWine(owners.createOwnerId(), added[1].id)).toEqual({
      ok: false,
      error: "not_found",
    });
    const deleted = await deleteWine(ownerId, added[1].id);
    expect(deleted.ok && deleted.wine.blindNumber).toBe(2);
    expect(await deleteWine(ownerId, added[1].id)).toEqual({
      ok: false,
      error: "not_found",
    });

    const loaded = await getTastingForOwner(ownerId, tasting.id);
    expect(
      loaded?.wines.map(({ blindNumber, name }) => [blindNumber, name]),
    ).toEqual([
      [1, "Ett"],
      [2, "Tre"],
      [3, "Fyra"],
    ]);

    const next = await addWine(ownerId, tasting.id, sampleWine);
    expect(next.ok && next.wine.blindNumber).toBe(4);
  });

  it("numrerar rätt när två viner tas bort samtidigt", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Samtidigt" });
    const added = [];
    for (const name of ["Ett", "Två", "Tre"]) {
      added.push(
        unwrap(
          await addWine(ownerId, tasting.id, { ...sampleWine, name }),
          "Kunde inte lägga till vin",
        ).wine,
      );
    }

    const results = await Promise.all([
      deleteWine(ownerId, added[0].id),
      deleteWine(ownerId, added[1].id),
    ]);
    expect(results.map((result) => result.ok)).toEqual([true, true]);

    const loaded = await getTastingForOwner(ownerId, tasting.id);
    expect(
      loaded?.wines.map(({ blindNumber, name }) => [blindNumber, name]),
    ).toEqual([[1, "Tre"]]);
  });

  it("tar inte bort viner när provningen har startat", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Startad" });
    const added = unwrap(
      await addWine(ownerId, tasting.id, sampleWine),
      "Kunde inte lägga till vin",
    );
    await advanceTastingStatus(ownerId, tasting.id, "draft");

    expect(await deleteWine(ownerId, added.wine.id)).toEqual({
      ok: false,
      error: "invalid_state",
    });
    expect((await getTastingForOwner(ownerId, tasting.id))?.wines).toHaveLength(
      1,
    );
  });

  it("skickar ingen vininformation till deltagare före avslöjandet", async () => {
    const ownerId = owners.createOwnerId();
    const tasting = await createTasting(ownerId, { name: "Blint" });
    await addWine(ownerId, tasting.id, sampleWine);
    const { participant } = unwrap(
      await joinTasting({ code: tasting.code, displayName: "Kim" }),
      "Kunde inte gå med",
    );

    for (const step of ["draft", "live"] as const) {
      const blind = await listWinesForParticipant(participant);
      expect(blind, step).toEqual([
        {
          id: expect.any(String),
          blindNumber: 1,
          isOpen: false,
          type: "red",
          details: null,
        },
      ]);
      expect(JSON.stringify(blind)).not.toContain("Vietti");
      await advanceTastingStatus(ownerId, tasting.id, step);
    }

    const revealed = await listWinesForParticipant(participant);
    const { type, ...details } = sampleWine;
    expect(revealed[0]).toMatchObject({ type, details });
  });

  it("låter en deltagare bara läsa sin egen provnings viner", async () => {
    const ownerId = owners.createOwnerId();
    const own = await createTasting(ownerId, { name: "Egen" });
    const other = await createTasting(ownerId, { name: "Annan" });
    const ownWine = unwrap(
      await addWine(ownerId, own.id, sampleWine),
      "Kunde inte lägga till vin",
    );
    await addWine(ownerId, other.id, sampleWine);
    const { participant } = unwrap(
      await joinTasting({ code: own.code, displayName: "Kim" }),
      "Kunde inte gå med",
    );

    const visible = await listWinesForParticipant(participant);
    expect(visible.map((wine) => wine.id)).toEqual([ownWine.wine.id]);
    expect((await findTastingForParticipant(participant))?.id).toBe(own.id);
  });
});
