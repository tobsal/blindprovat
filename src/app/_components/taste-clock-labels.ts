import type { TasteClock } from "@/domain/rating";

// Samma namn som på Systembolagets smakklockor. low och high beskriver
// skalans ändpunkter.
export const tasteClockLabels: Record<
  TasteClock,
  { name: string; low: string; high: string }
> = {
  sweetness: { name: "Sötma", low: "Torrt", high: "Sött" },
  body: { name: "Fyllighet", low: "Lätt", high: "Fylligt" },
  astringency: { name: "Strävhet", low: "Mjukt", high: "Strävt" },
  acidity: { name: "Fruktsyra", low: "Låg", high: "Hög" },
};
