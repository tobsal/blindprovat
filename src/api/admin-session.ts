import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";

export type AdminSession = { ownerId: string; name: string | null };

// All sessionsläsning för admin går hit. Presentationslagret importerar inte
// @/auth direkt. Sessionen finns bara om den har ett ägar-id, så en session
// utan det räknas som utloggad.
export async function getAdminSession(): Promise<AdminSession | null> {
  // auth() använder slumpvärden när sessionen läses (till exempel CSRF-token),
  // och de får inte förrenderas.
  await connection();
  const session = await auth();
  if (!session?.user.ownerId) return null;
  return { ownerId: session.user.ownerId, name: session.user.name ?? null };
}

// Varje admin-anrop ska börja här. En layout skyddar inte server actions,
// så behörigheten måste kontrolleras i själva anropet.
export async function requireAdminOwnerId(): Promise<string> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session.ownerId;
}
