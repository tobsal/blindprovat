import Link from "next/link";
import { tastingNotFoundMessage } from "@/api/error-messages";

export default function AdminNotFound() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 p-6">
      <h1 className="text-2xl font-semibold">Provningen finns inte</h1>
      <p className="mt-4">{tastingNotFoundMessage}</p>
      <Link
        href="/admin"
        className="mt-6 inline-flex min-h-11 items-center rounded border border-foreground px-4 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Till dina provningar
      </Link>
    </main>
  );
}
