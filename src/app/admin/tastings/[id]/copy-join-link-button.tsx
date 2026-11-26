"use client";

import { useState } from "react";
import { FormError } from "@/app/_components/form-error";
import { useToast } from "@/app/_components/toast";

// Kopierar länken som tar deltagaren till startsidan med koden ifylld.
export function CopyJoinLinkButton({ code }: { code: string }) {
  // Satt när kopieringen misslyckats, så att länken kan kopieras för hand.
  const [uncopiedLink, setUncopiedLink] = useState<string | null>(null);
  const showToast = useToast();

  async function copyLink() {
    const link = `${window.location.origin}/?code=${code}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Väntat fel: urklipp kan vara blockerat och saknas utan https. Det
      // visas för användaren och loggas inte, eftersom länken innehåller koden.
      setUncopiedLink(link);
      return;
    }
    setUncopiedLink(null);
    showToast("Länken är kopierad.");
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <button
        type="button"
        onClick={copyLink}
        className="btn-secondary self-start"
      >
        Kopiera länk
      </button>
      {uncopiedLink && (
        <>
          <FormError>
            Länken kunde inte kopieras. Markera den och kopiera för hand.
          </FormError>
          <label className="flex flex-col gap-1 font-medium">
            Länk till provningen
            <input
              type="text"
              readOnly
              value={uncopiedLink}
              onFocus={(event) => event.target.select()}
              className="min-h-12 rounded border border-outline bg-surface px-4 text-base font-normal"
            />
          </label>
        </>
      )}
    </div>
  );
}
