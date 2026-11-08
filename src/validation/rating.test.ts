import { describe, expect, it } from "vitest";
import { messagesFor } from "@/test-support/messages-for";
import { ratingInputSchema } from "./rating";

const valid = { score: 7 };

describe("ratingInputSchema", () => {
  it("godtar ett giltigt betyg och fyller i standardvärden", () => {
    expect(ratingInputSchema.parse(valid)).toEqual({
      score: 7,
      note: null,
      tags: [],
      guess: null,
      sweetness: null,
      body: null,
      astringency: null,
      acidity: null,
    });
  });

  it.each([1, 10])("godtar poäng %i", (score) => {
    expect(ratingInputSchema.safeParse({ score }).success).toBe(true);
  });

  it.each([0, 11, -1, 5.5, NaN])("avvisar poäng %s", (score) => {
    expect(messagesFor(ratingInputSchema, { score })).toEqual([
      "Välj ett betyg mellan 1 och 10",
    ]);
  });

  it("avvisar saknad eller icke-numerisk poäng", () => {
    expect(messagesFor(ratingInputSchema, {})).toEqual(["Välj ett betyg mellan 1 och 10"]);
    expect(messagesFor(ratingInputSchema, { score: "7" })).toEqual([
      "Välj ett betyg mellan 1 och 10",
    ]);
  });

  it("trimmar anteckning och gissning", () => {
    const result = ratingInputSchema.parse({
      ...valid,
      note: "  Fruktig och len  ",
      guess: "  Pinot Noir  ",
    });
    expect(result.note).toBe("Fruktig och len");
    expect(result.guess).toBe("Pinot Noir");
  });

  it("gör tom eller blank text till null", () => {
    const result = ratingInputSchema.parse({ ...valid, note: "   ", guess: "" });
    expect(result.note).toBeNull();
    expect(result.guess).toBeNull();
  });

  it("godtar anteckning på exakt 500 tecken men inte 501", () => {
    expect(
      ratingInputSchema.safeParse({ ...valid, note: "a".repeat(500) }).success,
    ).toBe(true);
    expect(messagesFor(ratingInputSchema, { ...valid, note: "a".repeat(501) })).toEqual([
      "Anteckningen får vara högst 500 tecken",
    ]);
  });

  it("räknar längden efter trimning", () => {
    const padded = `  ${"a".repeat(500)}  `;
    expect(
      ratingInputSchema.safeParse({ ...valid, note: padded }).success,
    ).toBe(true);
  });

  it("godtar gissning på exakt 100 tecken men inte 101", () => {
    expect(
      ratingInputSchema.safeParse({ ...valid, guess: "a".repeat(100) }).success,
    ).toBe(true);
    expect(messagesFor(ratingInputSchema, { ...valid, guess: "a".repeat(101) })).toEqual([
      "Gissningen får vara högst 100 tecken",
    ]);
  });

  it("godtar upp till fem taggar", () => {
    const tags = ["fruity", "spicy", "oaky", "herbal", "mineral"];
    expect(ratingInputSchema.parse({ ...valid, tags }).tags).toEqual(tags);
  });

  it("avvisar sex taggar", () => {
    const tags = ["fruity", "spicy", "oaky", "herbal", "mineral", "floral"];
    expect(messagesFor(ratingInputSchema, { ...valid, tags })).toEqual([
      "Du kan välja högst 5 taggar",
    ]);
  });

  it.each(["buttery", "acidic", "tannic", "sweet"])(
    "avvisar okänd eller borttagen tagg %s",
    (tag) => {
      expect(messagesFor(ratingInputSchema, { ...valid, tags: [tag] })).toEqual([
        "Välj bland taggarna i listan",
      ]);
    },
  );

  it("avvisar dubbletter bland taggarna", () => {
    expect(messagesFor(ratingInputSchema, { ...valid, tags: ["fruity", "fruity"] })).toEqual([
      "Varje tagg kan bara väljas en gång",
    ]);
  });

  describe("smakklockor", () => {
    it("godtar 1 och 12 i varje klocka", () => {
      const clocks = { sweetness: 1, body: 12, astringency: 1, acidity: 12 };
      expect(ratingInputSchema.parse({ ...valid, ...clocks })).toMatchObject(
        clocks,
      );
    });

    it("gör saknad klocka till null", () => {
      expect(ratingInputSchema.parse({ ...valid, body: null }).body).toBeNull();
      expect(ratingInputSchema.parse(valid).acidity).toBeNull();
    });

    it.each([0, 13, 6.5, NaN])("avvisar %s", (body) => {
      expect(messagesFor(ratingInputSchema, { ...valid, body })).toEqual([
        "Välj ett värde mellan 1 och 12 eller lämna tomt",
      ]);
    });
  });
});
