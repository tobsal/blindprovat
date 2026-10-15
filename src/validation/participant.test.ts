import { describe, expect, it } from "vitest";
import { joinTastingInputSchema } from "./participant";

const validInput = { code: "ABCDE23456", displayName: "Kim" };

function messagesFor(input: unknown) {
  const result = joinTastingInputSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

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
    expect(messagesFor({ ...validInput, code: "ABCDE2345" })).toEqual([message]);
    expect(messagesFor({ ...validInput, code: "ABCDE23450" })).toEqual([
      message,
    ]);
    expect(messagesFor({ ...validInput, code: undefined })).toEqual([message]);
  });

  it("trimmar namnet och kräver att det finns", () => {
    expect(
      joinTastingInputSchema.parse({ ...validInput, displayName: "  Kim " })
        .displayName,
    ).toBe("Kim");
    expect(messagesFor({ ...validInput, displayName: "  " })).toEqual([
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
    expect(messagesFor({ ...validInput, displayName: "a".repeat(31) })).toEqual(
      ["Namnet får vara högst 30 tecken"],
    );
  });
});
