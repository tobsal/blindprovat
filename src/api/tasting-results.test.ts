import { describe, expect, it } from "vitest";
import { buildResultsView } from "./tasting-results";

const details = {
  name: "Barolo",
  producer: null,
  grape: null,
  region: null,
  country: null,
  vintage: 2019,
  price: null,
  articleNumber: null,
};
const wines = [
  { id: "w1", blindNumber: 1, details: { ...details, name: "Ett" } },
  { id: "w2", blindNumber: 2, details: { ...details, name: "Två" } },
  { id: "w3", blindNumber: 3, details: { ...details, name: "Tre" } },
];
const participants = [
  { id: "p1", displayName: "Lisa" },
  { id: "p2", displayName: "Kim" },
  { id: "p3", displayName: "Åsa" },
];
const noClocks = {
  sweetness: null,
  body: null,
  astringency: null,
  acidity: null,
};
const ratings = [
  { wineId: "w1", participantId: "p1", score: 4, ...noClocks, body: 6 },
  { wineId: "w1", participantId: "p2", score: 6, ...noClocks, body: 9 },
  { wineId: "w2", participantId: "p1", score: 9, ...noClocks },
  { wineId: "w2", participantId: "p2", score: 9, ...noClocks },
];

describe("buildResultsView", () => {
  it("rankar vinerna och lägger viner utan betyg sist", () => {
    const view = buildResultsView({ wines, participants, ratings });
    expect(view.wines.map((wine) => wine.details.name)).toEqual([
      "Två",
      "Ett",
      "Tre",
    ]);
    expect(view.wines[0].rating).toMatchObject({
      rank: 1,
      average: 9,
      count: 2,
    });
    expect(view.wines[2].rating).toBeNull();
  });

  it("visar gruppens snitt per smakklocka för varje vin", () => {
    const view = buildResultsView({ wines, participants, ratings });
    const byName = Object.fromEntries(
      view.wines.map((wine) => [wine.details.name, wine.tasteClocks]),
    );
    expect(byName).toEqual({
      Ett: { ...noClocks, body: 7.5 },
      Två: noClocks,
      Tre: noClocks,
    });
  });

  it("kopplar rätt smeknamn till placeringen och lägger ojämförda sist", () => {
    const view = buildResultsView({ wines, participants, ratings });
    const byName = Object.fromEntries(
      view.participants.map((p) => [p.displayName, p.rank]),
    );
    // Lisa och Kim avviker lika mycket från snittet och delar plats.
    expect(byName).toEqual({ Kim: 1, Lisa: 1, Åsa: null });
    expect(view.participants[2]).toMatchObject({
      displayName: "Åsa",
      meanDeviation: null,
      comparedWineCount: 0,
    });
  });

  it("visar inget eget betyg för admin", () => {
    const view = buildResultsView({ wines, participants, ratings });
    expect(view.wines.every((wine) => wine.ownScore === null)).toBe(true);
    expect(view.participants.every((p) => !p.isSelf)).toBe(true);
  });

  it("markerar tittaren och visar bara tittarens egna betyg", () => {
    const view = buildResultsView({
      wines,
      participants,
      ratings,
      ownParticipantId: "p1",
    });
    expect(
      view.wines.map((wine) => [wine.details.name, wine.ownScore]),
    ).toEqual([
      ["Två", 9],
      ["Ett", 4],
      ["Tre", null],
    ]);
    expect(view.participants.filter((p) => p.isSelf)).toHaveLength(1);
    expect(view.participants.find((p) => p.isSelf)?.displayName).toBe("Lisa");
  });

  it("läcker inga deltagar-id:n eller enskilda poäng", () => {
    const json = JSON.stringify(
      buildResultsView({ wines, participants, ratings }),
    );
    expect(json).not.toContain("participantId");
    expect(json).not.toMatch(/"p[123]"/);
  });

  it("hanterar en provning utan betyg", () => {
    const view = buildResultsView({ wines, participants, ratings: [] });
    expect(view.wines.every((wine) => wine.rating === null)).toBe(true);
    expect(view.participants.every((p) => p.rank === null)).toBe(true);
  });
});
