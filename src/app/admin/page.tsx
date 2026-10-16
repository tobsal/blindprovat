import Link from "next/link";
import { listMyTastings } from "@/api/admin-tastings";
import { tastingStatusLabels } from "./tasting-status";

export default async function AdminPage() {
  const tastings = await listMyTastings();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dina provningar</h1>
        <Link
          href="/admin/tastings/new"
          className="inline-flex min-h-11 items-center rounded bg-foreground px-4 text-background focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Ny provning
        </Link>
      </div>
      {tastings.length === 0 ? (
        <p className="mt-6">Du har inga provningar än.</p>
      ) : (
        <ul className="mt-6 divide-y divide-foreground/30 border-y border-foreground/30">
          {tastings.map((tasting) => (
            <li key={tasting.id}>
              <Link
                href={`/admin/tastings/${tasting.id}`}
                className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-2 py-3 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span className="font-medium">{tasting.name}</span>
                <span>Status: {tastingStatusLabels[tasting.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
