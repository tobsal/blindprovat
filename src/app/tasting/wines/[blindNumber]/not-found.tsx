import Link from "next/link";
import { wineNotFoundMessage } from "@/api/error-messages";

export default function WineNotFound() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 p-4">
      <h1 className="text-2xl font-semibold">Vinet finns inte</h1>
      <p className="mt-4">{wineNotFoundMessage}</p>
      <Link href="/tasting" className="btn-secondary mt-6">
        Till alla viner
      </Link>
    </main>
  );
}
