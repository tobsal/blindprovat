import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Varje admin-anrop ska börja här. En layout skyddar inte server actions,
// så behörigheten måste kontrolleras i själva anropet.
export async function requireAdminOwnerId(): Promise<string> {
  const session = await auth();
  const ownerId = session?.user?.ownerId;
  if (!ownerId) redirect("/login");
  return ownerId;
}
