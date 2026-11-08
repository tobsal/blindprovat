import type { WineType } from "./wine";

export const SCORE_MIN = 1;
export const SCORE_MAX = 10;

export const NOTE_MAX = 500;
export const GUESS_MAX = 100;

// Doft och smak, ordnade som i WSET: först druvans egna (primära), sedan
// från fat och jäst (sekundära), sist från mognad (tertiära). Struktur
// (sötma, syra, strävhet, fyllighet) bedöms med smakklockorna i stället.
export const RATING_TAGS = [
  "fruity",
  "floral",
  "spicy",
  "herbal",
  "mineral",
  "oaky",
  "bready",
  "earthy",
] as const;

export type RatingTag = (typeof RATING_TAGS)[number];

export const MAX_TAGS = 5;

// Smakklockor som Systembolagets, med samma skala.
export const TASTE_CLOCKS = [
  "sweetness",
  "body",
  "astringency",
  "acidity",
] as const;

export type TasteClock = (typeof TASTE_CLOCKS)[number];

export const TASTE_CLOCK_MIN = 1;
export const TASTE_CLOCK_MAX = 12;

// null betyder att deltagaren inte har angett något.
export type TasteClockValues = Record<TasteClock, number | null>;

const RED_WINE_CLOCKS = ["body", "astringency", "acidity"] as const;
const OTHER_WINE_CLOCKS = ["sweetness", "body", "acidity"] as const;

// Systembolaget visar strävhet för rött och sötma för övriga viner. Viner
// som lades till innan vintypen fanns saknar typ och får alla klockor.
export function tasteClocksForWineType(
  type: WineType | null,
): readonly TasteClock[] {
  if (type === null) return TASTE_CLOCKS;
  return type === "red" ? RED_WINE_CLOCKS : OTHER_WINE_CLOCKS;
}

// Klockor som inte hör till vintypen nollställs.
export function keepTasteClocksForWineType(
  values: TasteClockValues,
  type: WineType | null,
): TasteClockValues {
  const clocks = tasteClocksForWineType(type);
  return {
    sweetness: clocks.includes("sweetness") ? values.sweetness : null,
    body: clocks.includes("body") ? values.body : null,
    astringency: clocks.includes("astringency") ? values.astringency : null,
    acidity: clocks.includes("acidity") ? values.acidity : null,
  };
}
