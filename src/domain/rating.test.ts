import { describe, expect, it } from "vitest";
import {
  keepTasteClocksForWineType,
  tasteClocksForWineType,
  TASTE_CLOCKS,
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
