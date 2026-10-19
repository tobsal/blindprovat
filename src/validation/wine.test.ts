import { describe, expect, it } from "vitest";
import { messagesFor } from "@/test-support/messages-for";
import { wineFormSchema, wineInputSchema } from "./wine";

const valid = { name: "Barolo" };

describe("wineInputSchema", () => {
  it("godtar bara namn och sätter övriga fält till null", () => {
    expect(wineInputSchema.parse(valid)).toEqual({
      name: "Barolo",
      producer: null,
      grape: null,
      region: null,
      country: null,
      vintage: null,
      price: null,
    });
  });

  it("kräver namn efter trimning", () => {
    expect(messagesFor(wineInputSchema, { name: "   " })).toEqual(["Ange vinets namn"]);
    expect(messagesFor(wineInputSchema, {})).toEqual(["Ange vinets namn"]);
  });

  it("godtar namn på 120 tecken men inte 121", () => {
    expect(
      wineInputSchema.safeParse({ name: "a".repeat(120) }).success,
    ).toBe(true);
    expect(messagesFor(wineInputSchema, { name: "a".repeat(121) })).toEqual([
      "Namnet får vara högst 120 tecken",
    ]);
  });

  it("trimmar valfria textfält och gör tomma till null", () => {
    const result = wineInputSchema.parse({
      ...valid,
      producer: "  Giacomo Conterno ",
      grape: "",
      region: "   ",
    });
    expect(result.producer).toBe("Giacomo Conterno");
    expect(result.grape).toBeNull();
    expect(result.region).toBeNull();
  });

  it("avvisar valfria textfält över 100 tecken", () => {
    expect(messagesFor(wineInputSchema, { ...valid, country: "a".repeat(101) })).toEqual([
      "Landet får vara högst 100 tecken",
    ]);
  });

  describe("årgång", () => {
    const thisYear = new Date().getFullYear();

    it.each([1900, thisYear])("godtar %i", (vintage) => {
      expect(wineInputSchema.parse({ ...valid, vintage }).vintage).toBe(vintage);
    });

    it("godtar null som årgångslöst", () => {
      expect(wineInputSchema.parse({ ...valid, vintage: null }).vintage).toBeNull();
    });

    it.each([1899, thisYear + 1])("avvisar %i", (vintage) => {
      expect(messagesFor(wineInputSchema, { ...valid, vintage })).toEqual([
        "Årgången måste vara mellan 1900 och i år",
      ]);
    });

    it("avvisar decimaltal och text", () => {
      expect(messagesFor(wineInputSchema, { ...valid, vintage: 2019.5 })).toEqual([
        "Ange ett årtal eller lämna tomt",
      ]);
      expect(messagesFor(wineInputSchema, { ...valid, vintage: "2019" })).toEqual([
        "Ange ett årtal eller lämna tomt",
      ]);
    });
  });

  describe("pris", () => {
    it.each([0, 100_000])("godtar %i kr", (price) => {
      expect(wineInputSchema.parse({ ...valid, price }).price).toBe(price);
    });

    it.each([-1, 100_001, 99.5])("avvisar %s kr", (price) => {
      expect(messagesFor(wineInputSchema, { ...valid, price })).toEqual([
        "Ange ett pris i hela kronor, mellan 0 och 100000",
      ]);
    });
  });
});

describe("wineFormSchema", () => {
  it("gör om tal i text till tal", () => {
    const result = wineFormSchema.parse({
      ...valid,
      vintage: " 2019 ",
      price: "450",
    });
    expect(result.vintage).toBe(2019);
    expect(result.price).toBe(450);
  });

  it("gör tomma talfält och saknade fält till null", () => {
    const result = wineFormSchema.parse({ ...valid, vintage: "", price: "  " });
    expect(result.vintage).toBeNull();
    expect(result.price).toBeNull();
    expect(wineFormSchema.parse({ ...valid, vintage: null }).vintage).toBeNull();
  });

  it("ger samma felmeddelanden som för tal", () => {
    expect(messagesFor(wineFormSchema, { ...valid, vintage: "nittonhundra" })).toEqual([
      "Ange ett årtal eller lämna tomt",
    ]);
    expect(messagesFor(wineFormSchema, { ...valid, vintage: "1899" })).toEqual([
      "Årgången måste vara mellan 1900 och i år",
    ]);
    expect(messagesFor(wineFormSchema, { ...valid, price: "12,50" })).toEqual([
      "Ange ett pris i hela kronor, mellan 0 och 100000",
    ]);
  });

  it("trimmar och kräver namn som vanligt", () => {
    expect(messagesFor(wineFormSchema, { name: "  " })).toEqual(["Ange vinets namn"]);
  });
});
