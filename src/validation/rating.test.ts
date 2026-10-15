import { describe, expect, it } from "vitest";
import { ratingInputSchema } from "./rating";

const valid = { score: 7 };

function messagesFor(input: unknown) {
  const result = ratingInputSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe("ratingInputSchema", () => {
  it("godtar minsta möjliga betyg och fyller i standardvärden", () => {
    expect(ratingInputSchema.parse(valid)).toEqual({
      score: 7,
      note: null,
      tags: [],
      guess: null,
    });
  });

  it.each([1, 10])("godtar poäng %i", (score) => {
    expect(ratingInputSchema.safeParse({ score }).success).toBe(true);
  });

  it.each([0, 11, -1, 5.5, NaN])("avvisar poäng %s", (score) => {
    expect(messagesFor({ score })).toEqual([
      "Välj ett betyg mellan 1 och 10",
    ]);
  });

  it("avvisar saknad eller icke-numerisk poäng", () => {
    expect(messagesFor({})).toEqual(["Välj ett betyg mellan 1 och 10"]);
    expect(messagesFor({ score: "7" })).toEqual([
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
    expect(messagesFor({ ...valid, note: "a".repeat(501) })).toEqual([
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
    expect(messagesFor({ ...valid, guess: "a".repeat(101) })).toEqual([
      "Gissningen får vara högst 100 tecken",
    ]);
  });

  it("godtar upp till fem taggar", () => {
    const tags = ["fruity", "spicy", "oaky", "acidic", "mineral"];
    expect(ratingInputSchema.parse({ ...valid, tags }).tags).toEqual(tags);
  });

  it("avvisar sex taggar", () => {
    const tags = ["fruity", "spicy", "oaky", "acidic", "mineral", "floral"];
    expect(messagesFor({ ...valid, tags })).toEqual([
      "Du kan välja högst 5 taggar",
    ]);
  });

  it("avvisar okänd tagg", () => {
    expect(messagesFor({ ...valid, tags: ["buttery"] })).toEqual([
      "Välj bland taggarna i listan",
    ]);
  });

  it("avvisar dubbletter bland taggarna", () => {
    expect(messagesFor({ ...valid, tags: ["fruity", "fruity"] })).toEqual([
      "Varje tagg kan bara väljas en gång",
    ]);
  });
});
