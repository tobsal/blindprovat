import { describe, expect, it } from "vitest";
import { optionalText } from "./optional-text";

const schema = optionalText(5, "För lång");

describe("optionalText", () => {
  it("trimmar texten", () => {
    expect(schema.parse("  abc  ")).toBe("abc");
  });

  it("gör tom text, bara mellanslag och saknat värde till null", () => {
    expect(schema.parse("")).toBeNull();
    expect(schema.parse("   ")).toBeNull();
    expect(schema.parse(null)).toBeNull();
    expect(schema.parse(undefined)).toBeNull();
  });

  it("godtar exakt max antal tecken men inte ett fler, mätt efter trimning", () => {
    expect(schema.parse("  abcde  ")).toBe("abcde");
    const result = schema.safeParse("abcdef");
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "För lång",
    ]);
  });
});
