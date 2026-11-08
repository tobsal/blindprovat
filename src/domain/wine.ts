export const WINE_NAME_MAX = 120;
export const WINE_DETAIL_MAX = 100;

export const VINTAGE_MIN = 1900;

// Pris i hela kronor.
export const PRICE_MIN = 0;
export const PRICE_MAX = 100_000;

// Vintypen styr vilka smakklockor deltagaren fyller i.
export const WINE_TYPES = ["red", "white", "rose", "sparkling"] as const;

export type WineType = (typeof WINE_TYPES)[number];
