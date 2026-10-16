import type { TastingStatus } from "@/domain/tasting";

export const tastingStatusLabels: Record<TastingStatus, string> = {
  draft: "Förbereds",
  live: "Pågår",
  revealed: "Avslöjad",
};
