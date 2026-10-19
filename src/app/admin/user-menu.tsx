import { logOut } from "@/api/admin-auth-actions";
import { getAdminSession } from "@/api/admin-session";

export async function UserMenu() {
  const session = await getAdminSession();
  if (!session) return null;

  return (
    <div className="flex items-center gap-3">
      <p>Inloggad som {session.name ?? "okänd användare"}</p>
      <form action={logOut}>
        <button
          type="submit"
          className="btn-secondary"
        >
          Logga ut
        </button>
      </form>
    </div>
  );
}
