import { logOut } from "@/api/admin-auth-actions";
import { getAdminSession } from "@/api/admin-session";
import { PendingSubmitButton } from "@/app/_components/pending-submit-button";

export async function UserMenu() {
  const session = await getAdminSession();
  if (!session) return null;

  return (
    <div className="flex items-center gap-3">
      <p>Inloggad som {session.name ?? "okänd användare"}</p>
      <form action={logOut}>
        <PendingSubmitButton
          pendingLabel="Loggar ut …"
          className="btn-secondary"
        >
          Logga ut
        </PendingSubmitButton>
      </form>
    </div>
  );
}
