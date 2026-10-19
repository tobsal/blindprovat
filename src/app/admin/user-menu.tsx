import { connection } from "next/server";
import { auth, signOut } from "@/auth";

async function logOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export async function UserMenu() {
  // auth() skapar slumpvärden som inte får förrenderas.
  await connection();
  const session = await auth();
  if (!session) return null;

  return (
    <div className="flex items-center gap-3">
      <p>Inloggad som {session.user.name ?? "okänd användare"}</p>
      <form action={logOut}>
        <button
          type="submit"
          className="min-h-11 rounded border border-foreground px-4 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Logga ut
        </button>
      </form>
    </div>
  );
}
