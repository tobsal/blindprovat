import { describe, expect, it } from "vitest";
import {
  canAddWines,
  canJoinTasting,
  canOpenWines,
  canRateWines,
  canRevealWineDetails,
  formatTastingCode,
  nextTastingStatus,
  TASTING_CODE_ALPHABET,
  TASTING_CODE_LENGTH,
} from "./tasting";

describe("nextTastingStatus", () => {
  it("går framåt från draft till live till revealed", () => {
    expect(nextTastingStatus("draft")).toBe("live");
    expect(nextTastingStatus("live")).toBe("revealed");
  });

  it("har inget steg efter revealed", () => {
    expect(nextTastingStatus("revealed")).toBeNull();
  });
});

describe("statusregler", () => {
  it("tillåter att lägga till viner bara medan provningen förbereds", () => {
    expect(canAddWines("draft")).toBe(true);
    expect(canAddWines("live")).toBe(false);
    expect(canAddWines("revealed")).toBe(false);
  });

  it("tillåter att öppna och stänga viner bara medan provningen pågår", () => {
    expect(canOpenWines("draft")).toBe(false);
    expect(canOpenWines("live")).toBe(true);
    expect(canOpenWines("revealed")).toBe(false);
  });

  it("tillåter betyg bara medan provningen pågår", () => {
    expect(canRateWines("draft")).toBe(false);
    expect(canRateWines("live")).toBe(true);
    expect(canRateWines("revealed")).toBe(false);
  });

  it("tillåter att gå med tills provningen är avslöjad", () => {
    expect(canJoinTasting("draft")).toBe(true);
    expect(canJoinTasting("live")).toBe(true);
    expect(canJoinTasting("revealed")).toBe(false);
  });

  it("visar vinets uppgifter för deltagare först när provningen är avslöjad", () => {
    expect(canRevealWineDetails("draft")).toBe(false);
    expect(canRevealWineDetails("live")).toBe(false);
    expect(canRevealWineDetails("revealed")).toBe(true);
  });
});

describe("formatTastingCode", () => {
  it("har 32 unika tecken utan 0, O, 1 och I", () => {
    expect(new Set(TASTING_CODE_ALPHABET).size).toBe(32);
    expect(TASTING_CODE_ALPHABET).not.toMatch(/[0O1I]/);
  });

  it("ger en kod med rätt längd och bara tecken ur alfabetet", () => {
    const bytes = Uint8Array.from({ length: 16 }, (_, i) => i * 17);
    const code = formatTastingCode(bytes);
    expect(code).toHaveLength(TASTING_CODE_LENGTH);
    expect([...code].every((char) => TASTING_CODE_ALPHABET.includes(char))).toBe(
      true,
    );
  });

  it("ger samma kod för samma slump", () => {
    const bytes = Uint8Array.from([0, 1, 31, 32, 255, 64, 100, 7, 8, 9]);
    expect(formatTastingCode(bytes)).toBe("23Z2Z269AB");
  });

  it("kräver tillräckligt med slump", () => {
    expect(() => formatTastingCode(new Uint8Array(3))).toThrow();
  });
});
