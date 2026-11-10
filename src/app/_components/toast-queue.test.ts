import { describe, expect, it } from "vitest";
import { addToast, MAX_TOASTS, removeToast, type Toast } from "./toast-queue";

function toast(id: number, message = `Meddelande ${id}`): Toast {
  return { id, message };
}

describe("addToast", () => {
  it("lägger till sist i kön", () => {
    expect(addToast([toast(1)], toast(2))).toEqual([toast(1), toast(2)]);
  });

  it("behåller samma text två gånger som två bekräftelser", () => {
    const toasts = addToast([toast(1, "Sparat.")], toast(2, "Sparat."));
    expect(toasts.map((t) => t.id)).toEqual([1, 2]);
  });

  it("tar bort de äldsta när kön är full", () => {
    let toasts: Toast[] = [];
    for (let id = 1; id <= MAX_TOASTS + 2; id++) {
      toasts = addToast(toasts, toast(id));
    }
    expect(toasts).toHaveLength(MAX_TOASTS);
    expect(toasts.at(-1)?.id).toBe(MAX_TOASTS + 2);
    expect(toasts[0].id).toBe(3);
  });

  it("ändrar inte den gamla kön", () => {
    const before = [toast(1)];
    addToast(before, toast(2));
    expect(before).toEqual([toast(1)]);
  });
});

describe("removeToast", () => {
  it("tar bort bekräftelsen med rätt id", () => {
    expect(removeToast([toast(1), toast(2)], 1)).toEqual([toast(2)]);
  });

  it("lämnar kön orörd för ett okänt id", () => {
    expect(removeToast([toast(1)], 99)).toEqual([toast(1)]);
  });
});
