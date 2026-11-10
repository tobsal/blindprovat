import { describe, expect, it } from "vitest";
import { systembolagetUrl } from "./wine";

describe("systembolagetUrl", () => {
  it("söker på artikelnumret i Systembolagets sortiment", () => {
    expect(systembolagetUrl("262708")).toBe(
      "https://www.systembolaget.se/sortiment/?q=262708",
    );
  });
});
