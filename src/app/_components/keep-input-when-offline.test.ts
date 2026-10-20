import { describe, expect, it } from "vitest";
import {
  keepInputWhenOffline,
  offlineMessage,
} from "./keep-input-when-offline";

const fields = ["name", "producer"] as const;

function formWith(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) formData.set(key, value);
  return formData;
}

describe("keepInputWhenOffline", () => {
  it("skickar igenom svaret när anropet lyckas", async () => {
    const action = keepInputWhenOffline(
      async () => ({ message: "Klart" }),
      fields,
    );

    expect(await action({}, formWith({ name: "Barolo" }))).toEqual({
      message: "Klart",
    });
  });

  it("ger ett offlinefel och behåller värdena när nätverket saknas", async () => {
    const action = keepInputWhenOffline(async () => {
      throw new TypeError("Failed to fetch");
    }, fields);

    expect(
      await action({}, formWith({ name: "Barolo", producer: "Vietti" })),
    ).toEqual({
      formError: offlineMessage,
      values: { name: "Barolo", producer: "Vietti" },
    });
  });

  it("kastar vidare serverfel så att error.tsx tar hand om dem", async () => {
    const serverError = new Error("Serverfel");
    const action = keepInputWhenOffline(async () => {
      throw serverError;
    }, fields);

    await expect(action({}, formWith({ name: "Barolo" }))).rejects.toBe(
      serverError,
    );
  });
});
