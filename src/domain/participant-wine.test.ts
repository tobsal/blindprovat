import { describe, expect, it } from "vitest";
import { participantWineState } from "./participant-wine";

describe("participantWineState", () => {
  it("skiljer på öppet och stängt, med och utan eget betyg", () => {
    expect(participantWineState(true, false)).toBe("open");
    expect(participantWineState(true, true)).toBe("open_rated");
    expect(participantWineState(false, true)).toBe("rated");
    expect(participantWineState(false, false)).toBe("waiting");
  });
});
