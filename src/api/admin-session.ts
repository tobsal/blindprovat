import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";

// Varje admin-anrop ska börja här. En layout skyddar inte server actions,
// så behörigheten måste kontrolleras i själva anropet.
export async function requireAdminOwnerId(): Promise<string> {
  // auth() använder slumpvärden när sessionen läses, och de får inte
  // förrenderas.
  await connection();
  const session = await auth();
  const ownerId = session?.user?.ownerId;
  if (!ownerId) redirect("/login");
  return ownerId;
}
