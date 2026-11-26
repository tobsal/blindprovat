import { describe, expect, it } from "vitest";
import {
  hasUnsavedRatingChanges,
  keepTasteClocksForWineType,
  tasteClocksForWineType,
  TASTE_CLOCKS,
  type RatingDraft,
} from "./rating";

describe("tasteClocksForWineType", () => {
  it("ger fyllighet, strävhet och fruktsyra för rött", () => {
    expect(tasteClocksForWineType("red")).toEqual([
      "body",
      "astringency",
      "acidity",
    ]);
  });

  it.each(["white", "rose", "sparkling"] as const)(
    "ger sötma, fyllighet och fruktsyra för %s",
    (type) => {
      expect(tasteClocksForWineType(type)).toEqual([
        "sweetness",
        "body",
        "acidity",
      ]);
    },
  );

  it("ger alla klockor när vintypen saknas", () => {
    expect(tasteClocksForWineType(null)).toEqual(TASTE_CLOCKS);
  });
});

describe("keepTasteClocksForWineType", () => {
  const all = { sweetness: 3, body: 8, astringency: 9, acidity: 6 };

  it("nollställer sötma för rött", () => {
    expect(keepTasteClocksForWineType(all, "red")).toEqual({
      ...all,
      sweetness: null,
    });
  });

  it("nollställer strävhet för vitt", () => {
    expect(keepTasteClocksForWineType(all, "white")).toEqual({
      ...all,
      astringency: null,
    });
  });

  it("behåller allt när vintypen saknas", () => {
    expect(keepTasteClocksForWineType(all, null)).toEqual(all);
  });
});

describe("hasUnsavedRatingChanges", () => {
  const saved: RatingDraft = {
    score: 7,
    note: "Körsbär\r\noch jord.",
    tags: ["fruity", "oaky"],
    guess: null,
    sweetness: null,
    body: 9,
    astringency: null,
    acidity: null,
  };

  it("ser inga ändringar i ett oförändrat betyg", () => {
    expect(hasUnsavedRatingChanges(saved, { ...saved })).toBe(false);
  });

  it("bortser från taggarnas ordning, blanksteg runt text och radslut", () => {
    expect(
      hasUnsavedRatingChanges(saved, {
        ...saved,
        tags: ["oaky", "fruity"],
        note: " Körsbär\noch jord. ",
        guess: "  ",
      }),
    ).toBe(false);
  });

  it.each<[string, Partial<RatingDraft>]>([
    ["poängen", { score: 8 }],
    ["en smakklocka", { body: null }],
    ["en tillagd tagg", { tags: ["fruity", "oaky", "spicy"] }],
    ["en utbytt tagg", { tags: ["fruity", "spicy"] }],
    ["anteckningen", { note: "Körsbär." }],
    ["gissningen", { guess: "Pinot noir" }],
  ])("ser en ändring av %s", (_field, change) => {
    expect(hasUnsavedRatingChanges(saved, { ...saved, ...change })).toBe(true);
  });
});
