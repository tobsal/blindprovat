export const TASTING_NAME_MAX = 80;

// Statusen går bara framåt, i den här ordningen.
export const TASTING_STATUSES = ["draft", "live", "revealed"] as const;

export type TastingStatus = (typeof TASTING_STATUSES)[number];

export function nextTastingStatus(status: TastingStatus): TastingStatus | null {
  const index = TASTING_STATUSES.indexOf(status);
  return TASTING_STATUSES[index + 1] ?? null;
}

export function canRateWines(status: TastingStatus): boolean {
  return status === "live";
}

// 32 tecken utan de lättförväxlade 0, O, 1 och I. Med 10 tecken blir det
// 50 bitar slump, vilket inte går att gissa fram.
export const TASTING_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const TASTING_CODE_LENGTH = 10;

// Slumpen skickas in så att funktionen förblir ren. Eftersom 256 är delbart
// med 32 ger varje byte ett jämnt fördelat tecken.
export function formatTastingCode(randomBytes: Uint8Array): string {
  if (randomBytes.length < TASTING_CODE_LENGTH) {
    throw new Error(
      `formatTastingCode behöver minst ${TASTING_CODE_LENGTH} byte slump`,
    );
  }
  return Array.from(
    randomBytes.subarray(0, TASTING_CODE_LENGTH),
    (byte) => TASTING_CODE_ALPHABET[byte % TASTING_CODE_ALPHABET.length],
  ).join("");
}
