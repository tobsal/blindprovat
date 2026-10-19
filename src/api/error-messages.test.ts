import { describe, expect, it } from "vitest";
import {
  messageForRepositoryError,
  tastingNotFoundMessage,
} from "./error-messages";

describe("messageForRepositoryError", () => {
  it("ger samma text för saknad provning oavsett vad som försöktes", () => {
    expect(messageForRepositoryError("not_found", "A")).toBe(
      tastingNotFoundMessage,
    );
    expect(messageForRepositoryError("not_found", "B")).toBe(
      tastingNotFoundMessage,
    );
  });

  it("ger anroparens text för ogiltigt tillstånd", () => {
    expect(messageForRepositoryError("invalid_state", "Redan startad")).toBe(
      "Redan startad",
    );
  });
});
