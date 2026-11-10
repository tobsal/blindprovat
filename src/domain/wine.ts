export const WINE_NAME_MAX = 120;
export const WINE_DETAIL_MAX = 100;

export const VINTAGE_MIN = 1900;

// Pris i hela kronor.
export const PRICE_MIN = 0;
export const PRICE_MAX = 100_000;

// Vintypen styr vilka smakklockor deltagaren fyller i.
export const WINE_TYPES = ["red", "white", "rose", "sparkling"] as const;

export type WineType = (typeof WINE_TYPES)[number];

// Systembolagets artikelnummer med förpackningssuffix, till exempel 262708
// (artikel 2627, förpackning 08). Det lagras som text så att formatet
// behålls som det är.
export const ARTICLE_NUMBER_PATTERN = /^[0-9]{3,7}$/;
export const ARTICLE_NUMBER_MAX = 7;

// Länken går till Systembolagets sökning, som hittar vinet på numret.
export function systembolagetUrl(articleNumber: string): string {
  return `https://www.systembolaget.se/sortiment/?q=${encodeURIComponent(articleNumber)}`;
}
