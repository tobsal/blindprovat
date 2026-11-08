import { notFound, redirect } from "next/navigation";
import { describe, expect, it } from "vitest";
import {
  keepInputOnFailure,
  offlineMessage,
  serverErrorMessage,
} from "./keep-input-on-failure";

const fields = ["name", "producer"] as const;

function formWith(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) formData.set(key, value);
  return formData;
}

describe("keepInputOnFailure", () => {
  it("skickar igenom svaret när anropet lyckas", async () => {
    const action = keepInputOnFailure(
      async () => ({ message: "Klart" }),
      fields,
    );

    expect(await action({}, formWith({ name: "Barolo" }))).toEqual({
      message: "Klart",
    });
  });

  it("ger ett offlinefel och behåller värdena när nätverket saknas", async () => {
    const action = keepInputOnFailure(async () => {
      throw new TypeError("Failed to fetch");
    }, fields);

    expect(
      await action({}, formWith({ name: "Barolo", producer: "Vietti" })),
    ).toEqual({
      formError: offlineMessage,
      values: { name: "Barolo", producer: "Vietti" },
    });
  });

  it("ger ett serverfel och behåller värdena när servern misslyckas", async () => {
    const action = keepInputOnFailure(async () => {
      throw new Error("Serverfel");
    }, fields);

    expect(
      await action({}, formWith({ name: "Barolo", producer: "Vietti" })),
    ).toEqual({
      formError: serverErrorMessage,
      values: { name: "Barolo", producer: "Vietti" },
    });
  });

  it("kastar vidare omdirigeringar så att redirect fungerar", async () => {
    const action = keepInputOnFailure(async () => redirect("/tasting"), fields);

    await expect(action({}, formWith({ name: "Barolo" }))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
  });

  it("kastar vidare notFound så att not-found.tsx visas", async () => {
    const action = keepInputOnFailure(async () => notFound(), fields);

    await expect(action({}, formWith({ name: "Barolo" }))).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });
});
