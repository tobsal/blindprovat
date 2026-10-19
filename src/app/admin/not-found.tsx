import Link from "next/link";
import { tastingNotFoundMessage } from "@/api/error-messages";

export default function AdminNotFound() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 p-6">
      <h1 className="text-2xl font-semibold">Provningen finns inte</h1>
      <p className="mt-4">{tastingNotFoundMessage}</p>
      <Link
        href="/admin"
        className="btn-secondary mt-6"
      >
        Till dina provningar
      </Link>
    </main>
  );
}
