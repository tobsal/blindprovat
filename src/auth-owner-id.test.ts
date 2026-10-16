import { describe, expect, it } from "vitest";
import { ownerIdFromAccount } from "./auth-owner-id";

describe("ownerIdFromAccount", () => {
  it("bygger ägar-id av providern och kontots id hos providern", () => {
    expect(
      ownerIdFromAccount({ provider: "github", providerAccountId: "12345" }),
    ).toBe("github:12345");
  });

  it("ger samma id för samma konto vid varje inloggning", () => {
    const account = { provider: "github", providerAccountId: "12345" };
    expect(ownerIdFromAccount(account)).toBe(ownerIdFromAccount({ ...account }));
  });
});
