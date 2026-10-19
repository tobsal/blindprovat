import { describe, expect, it } from "vitest";
import { calculateResults, type ScoredRating } from "./results";

function rating(
  participantId: string,
  wineId: string,
  score: number,
): ScoredRating {
  return { participantId, wineId, score };
}

describe("calculateResults", () => {
  it("ger tomma listor utan viner och betyg", () => {
    expect(calculateResults([], [])).toEqual({ wines: [], participants: [] });
  });

  it("tar med viner utan betyg med tomma värden", () => {
    expect(calculateResults(["w1"], []).wines).toEqual([
      { wineId: "w1", rating: null },
    ]);
  });

  it("räknar snitt, lägsta och högsta per vin", () => {
    const { wines } = calculateResults(
      ["w1"],
      [rating("a", "w1", 6), rating("b", "w1", 9), rating("c", "w1", 7)],
    );
    expect(wines).toEqual([
      {
        wineId: "w1",
        rating: { rank: 1, average: 22 / 3, lowest: 6, highest: 9, count: 3 },
      },
    ]);
  });

  it("rankar viner efter snitt och låter lika snitt dela plats", () => {
    const { wines } = calculateResults(
      ["w1", "w2", "w3"],
      [
        rating("a", "w1", 6),
        rating("a", "w2", 8),
        rating("a", "w3", 8),
      ],
    );
    expect(wines.map((wine) => [wine.wineId, wine.rating?.rank])).toEqual([
      ["w2", 1],
      ["w3", 1],
      ["w1", 3],
    ]);
  });

  it("lägger viner utan betyg sist i ursprunglig ordning", () => {
    const { wines } = calculateResults(
      ["w1", "w2", "w3", "w4"],
      [rating("a", "w3", 5)],
    );
    expect(wines.map((wine) => wine.wineId)).toEqual(["w3", "w1", "w2", "w4"]);
  });

  it("räknar medelavvikelse och rankar närmast gruppen först", () => {
    // w1 snitt 7, w2 snitt 6. w3 har bara ett betyg och räknas inte.
    const { participants } = calculateResults(
      ["w1", "w2", "w3"],
      [
        rating("a", "w1", 8),
        rating("a", "w2", 5),
        rating("a", "w3", 9),
        rating("b", "w1", 6),
        rating("b", "w2", 6),
        rating("c", "w1", 7),
        rating("c", "w2", 7),
      ],
    );
    expect(participants).toEqual([
      { participantId: "b", rank: 1, meanDeviation: 0.5, comparedWineCount: 2 },
      { participantId: "c", rank: 1, meanDeviation: 0.5, comparedWineCount: 2 },
      { participantId: "a", rank: 3, meanDeviation: 1, comparedWineCount: 2 },
    ]);
  });

  it("utelämnar deltagare som saknar viner med minst två betyg", () => {
    const { participants } = calculateResults(
      ["w1", "w2"],
      [rating("a", "w1", 8), rating("b", "w1", 6), rating("c", "w2", 7)],
    );
    expect(participants.map((p) => p.participantId)).toEqual(["a", "b"]);
  });

  it("låter avvikelser som är lika trots flyttalsavrundning dela plats", () => {
    // w1 snitt 4/3, w2 snitt 8/3. a avviker 1/3 + 5/3 och b 2/3 + 4/3,
    // alltså 1 i snitt för båda, men i flyttal blir a 0.9999999999999999.
    const { participants } = calculateResults(
      ["w1", "w2"],
      [
        rating("a", "w1", 1),
        rating("a", "w2", 1),
        rating("b", "w1", 2),
        rating("b", "w2", 4),
        rating("c", "w1", 1),
        rating("c", "w2", 3),
      ],
    );
    expect(participants.map((p) => [p.participantId, p.rank])).toEqual([
      ["c", 1],
      ["a", 2],
      ["b", 2],
    ]);
  });

  it("ignorerar betyg på viner som inte ingår i provningen", () => {
    const { wines, participants } = calculateResults(
      ["w1"],
      [
        rating("a", "w1", 8),
        rating("b", "w1", 6),
        rating("a", "okänt", 1),
        rating("b", "okänt", 10),
      ],
    );
    expect(wines.map((wine) => wine.wineId)).toEqual(["w1"]);
    expect(participants.map((p) => p.comparedWineCount)).toEqual([1, 1]);
  });
});
