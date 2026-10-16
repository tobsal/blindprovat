import { describe, expect, it } from "vitest";
import { parseLoginError } from "./login-error";

describe("parseLoginError", () => {
  it("ger null när ingen felkod finns", () => {
    expect(parseLoginError(undefined)).toBeNull();
  });

  it("känner igen att inloggningen nekades", () => {
    expect(parseLoginError("AccessDenied")).toBe("AccessDenied");
  });

  it("ger ett allmänt fel för okända koder", () => {
    expect(parseLoginError("Configuration")).toBe("other");
    expect(parseLoginError("<script>")).toBe("other");
    expect(parseLoginError("")).toBe("other");
  });

  it("ger ett allmänt fel när parametern upprepas", () => {
    expect(parseLoginError(["AccessDenied", "x"])).toBe("other");
  });
});
