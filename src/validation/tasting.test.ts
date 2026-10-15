import { describe, expect, it } from "vitest";
import { tastingInputSchema } from "./tasting";

function messagesFor(input: unknown) {
  const result = tastingInputSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe("tastingInputSchema", () => {
  it("trimmar namnet", () => {
    expect(tastingInputSchema.parse({ name: "  Italienskt  " }).name).toBe(
      "Italienskt",
    );
  });

  it("kräver namn", () => {
    expect(messagesFor({ name: "  " })).toEqual(["Ange provningens namn"]);
    expect(messagesFor({})).toEqual(["Ange provningens namn"]);
  });

  it("godtar 80 tecken men inte 81", () => {
    expect(
      tastingInputSchema.safeParse({ name: "a".repeat(80) }).success,
    ).toBe(true);
    expect(messagesFor({ name: "a".repeat(81) })).toEqual([
      "Namnet får vara högst 80 tecken",
    ]);
  });
});
