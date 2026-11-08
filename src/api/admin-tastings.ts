import {
  getTastingForOwner,
  listTastingsForOwner,
  type AdminTasting,
  type AdminTastingWithWines,
  type AdminWine,
} from "@/repositories/tastings";
import { canShowResults } from "@/domain/tasting";
import { listParticipantNamesForOwner } from "@/repositories/participants";
import {
  countProgressForOwner,
  listScoredRatingsForOwner,
  type TastingProgress,
} from "@/repositories/ratings";
import { tastingIdSchema } from "@/validation/tasting";
import { requireAdminOwnerId } from "./admin-session";
import { buildResultsView, type ResultsView } from "./tasting-results";

export type { AdminTasting, AdminTastingWithWines, AdminWine, TastingProgress };

export async function listMyTastings(): Promise<AdminTasting[]> {
  const ownerId = await requireAdminOwnerId();
  return listTastingsForOwner(ownerId);
}

// Ogiltigt id, saknad provning och någon annans provning ger alla null.
export async function getMyTasting(
  rawId: string,
): Promise<AdminTastingWithWines | null> {
  const ownerId = await requireAdminOwnerId();
  const id = tastingIdSchema.safeParse(rawId);
  if (!id.success) return null;
  return getTastingForOwner(ownerId, id.data);
}

// Ogiltigt id, saknad provning, någon annans provning och en provning som
// inte är avslöjad ger alla null.
export async function getMyTastingResults(
  rawId: string,
): Promise<ResultsView | null> {
  const ownerId = await requireAdminOwnerId();
  const id = tastingIdSchema.safeParse(rawId);
  if (!id.success) return null;

  const tasting = await getTastingForOwner(ownerId, id.data);
  if (!tasting || !canShowResults(tasting.status)) return null;

  const [ratings, participants] = await Promise.all([
    listScoredRatingsForOwner(ownerId, tasting.id),
    listParticipantNamesForOwner(ownerId, tasting.id),
  ]);
  if (!ratings || !participants) return null;
  return buildResultsView({
    wines: tasting.wines.map((wine) => ({
      id: wine.id,
      blindNumber: wine.blindNumber,
      details: wine,
    })),
    participants,
    ratings,
  });
}

// Antal deltagare och betyg per vin. Ogiltigt id, saknad provning och någon
// annans provning ger alla null.
export async function getMyTastingProgress(
  rawId: string,
): Promise<TastingProgress | null> {
  const ownerId = await requireAdminOwnerId();
  const id = tastingIdSchema.safeParse(rawId);
  if (!id.success) return null;
  return countProgressForOwner(ownerId, id.data);
}
