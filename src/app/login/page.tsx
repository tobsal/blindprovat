import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth, signIn } from "@/auth";
import { FormError } from "@/app/_components/form-error";
import { LoadingStatus } from "@/app/_components/loading-status";
import { parseLoginError } from "@/validation/login-error";

const errorMessages = {
  AccessDenied: "Inloggningen nekades. Försök igen och godkänn inloggningen.",
  other: "Det gick inte att logga in just nu. Försök igen om en stund.",
};

async function logIn() {
  "use server";
  await signIn("github", { redirectTo: "/admin" });
}

// Med cacheComponents får sessionen och query-parametrarna bara läsas
// inom Suspense.
async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  // auth() skapar slumpvärden (CSRF-token) som inte får förrenderas.
  await connection();
  if (await auth()) redirect("/admin");

  const error = parseLoginError((await searchParams).error);

  return (
    <>
      {error && <FormError>{errorMessages[error]}</FormError>}
      <form action={logIn}>
        <button
          type="submit"
          className="btn-primary"
        >
          Logga in med GitHub
        </button>
      </form>
    </>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Logga in</h1>
      <p>Logga in med ditt GitHub-konto för att skapa och leda provningar.</p>
      <Suspense
        fallback={
          <LoadingStatus className="min-h-11" />
        }
      >
        <LoginContent searchParams={searchParams} />
      </Suspense>
      <Link
        href="/"
        className="link-action"
      >
        Till startsidan
      </Link>
    </main>
  );
}
