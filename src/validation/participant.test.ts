import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { messagesFor } from "@/test-support/messages-for";
import { joinTastingInputSchema, sessionTokenSchema } from "./participant";

const validInput = { code: "ABCDE23456", displayName: "Kim" };

describe("joinTastingInputSchema", () => {
  it("normaliserar koden till versaler utan mellanslag och bindestreck", () => {
    expect(
      joinTastingInputSchema.parse({ ...validInput, code: " abcde-234 56 " })
        .code,
    ).toBe("ABCDE23456");
  });

  it("nekar kod med fel längd eller tecken utanför alfabetet", () => {
    const message =
      "Koden består av 10 tecken. Kontrollera att du skrivit rätt.";
    expect(messagesFor(joinTastingInputSchema, { ...validInput, code: "ABCDE2345" })).toEqual([message]);
    expect(messagesFor(joinTastingInputSchema, { ...validInput, code: "ABCDE23450" })).toEqual([
      message,
    ]);
    expect(messagesFor(joinTastingInputSchema, { ...validInput, code: undefined })).toEqual([message]);
  });

  it("trimmar namnet och kräver att det finns", () => {
    expect(
      joinTastingInputSchema.parse({ ...validInput, displayName: "  Kim " })
        .displayName,
    ).toBe("Kim");
    expect(messagesFor(joinTastingInputSchema, { ...validInput, displayName: "  " })).toEqual([
      "Ange ditt namn",
    ]);
  });

  it("godtar 30 tecken i namnet men inte 31", () => {
    expect(
      joinTastingInputSchema.safeParse({
        ...validInput,
        displayName: "a".repeat(30),
      }).success,
    ).toBe(true);
    expect(messagesFor(joinTastingInputSchema, { ...validInput, displayName: "a".repeat(31) })).toEqual(
      ["Namnet får vara högst 30 tecken"],
    );
  });
});

describe("sessionTokenSchema", () => {
  it("godtar en token som en deltagare får vid anslutning", () => {
    const token = randomBytes(32).toString("base64url");
    expect(sessionTokenSchema.safeParse(token).success).toBe(true);
  });

  it("nekar fel längd, tecken utanför base64url och saknat värde", () => {
    expect(sessionTokenSchema.safeParse("a".repeat(42)).success).toBe(false);
    expect(sessionTokenSchema.safeParse("a".repeat(44)).success).toBe(false);
    expect(sessionTokenSchema.safeParse("a".repeat(42) + "=").success).toBe(
      false,
    );
    expect(sessionTokenSchema.safeParse(undefined).success).toBe(false);
  });
});
