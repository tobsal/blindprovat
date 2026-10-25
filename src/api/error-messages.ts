import type { RepositoryError } from "@/repositories/result";

// En saknad provning och någon annans provning ger samma svar (princip 14).
export const tastingNotFoundMessage =
  "Provningen finns inte, eller så har du inte åtkomst till den.";

// not_found ger alltid samma text. Vad invalid_state betyder beror på vad som
// försöktes, så anroparen anger den texten.
export function messageForRepositoryError(
  error: RepositoryError,
  invalidStateMessage: string,
): string {
  return error === "not_found" ? tastingNotFoundMessage : invalidStateMessage;
}

// En saknad, felskriven och avslöjad provning ger samma svar vid anslutning.
export const joinNotFoundMessage =
  "Vi hittar ingen provning med den koden. Kontrollera koden eller fråga den som håller i provningen.";

export const wineNotFoundMessage =
  "Vinet finns inte i den här provningen.";

export const wineClosedMessage =
  "Vinet är stängt för betyg. Det du skrivit har inte sparats.";
