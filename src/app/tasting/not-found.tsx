import Link from "next/link";
import { joinNotFoundMessage } from "@/api/error-messages";

export default function TastingNotFound() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 p-4">
      <h1 className="text-2xl font-semibold">Provningen finns inte</h1>
      <p className="mt-4">{joinNotFoundMessage}</p>
      <Link href="/" className="btn-secondary mt-6">
        Till startsidan
      </Link>
    </main>
  );
}
