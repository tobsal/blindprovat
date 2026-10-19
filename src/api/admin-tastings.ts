import {
  getTastingForOwner,
  listTastingsForOwner,
  type AdminTasting,
  type AdminTastingWithWines,
  type AdminWine,
} from "@/repositories/tastings";
import { tastingIdSchema } from "@/validation/tasting";
import { requireAdminOwnerId } from "./admin-session";

export type { AdminTasting, AdminTastingWithWines, AdminWine };

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
