import { and, eq } from "drizzle-orm";
import { tastings } from "./schema";

// Det enda stället som uttrycker att en provning tillhör en ägare (princip 6).
// Alla adminfrågor mot en enskild provning går genom det här villkoret, så en
// provning som någon annan äger ger samma svar som en som inte finns.
export function tastingOwnedBy(ownerId: string, tastingId: string) {
  return and(eq(tastings.id, tastingId), eq(tastings.ownerId, ownerId));
}
