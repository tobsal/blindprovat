import { Suspense } from "react";
import Link from "next/link";
import { listMyTastings } from "@/api/admin-tastings";
import { LoadingStatus } from "@/app/_components/loading-status";
import { tastingStatusLabels } from "./tasting-status";

async function TastingList() {
  const tastings = await listMyTastings();

  if (tastings.length === 0) {
    return <p className="mt-6">Du har inga provningar än.</p>;
  }

  return (
    <ul className="mt-6 divide-y divide-foreground/30 border-y border-foreground/30">
      {tastings.map((tasting) => (
        <li key={tasting.id}>
          <Link
            href={`/admin/tastings/${tasting.id}`}
            className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-2 py-3 underline-offset-4 hover:underline"
          >
            <span className="font-medium">{tasting.name}</span>
            <span>Status: {tastingStatusLabels[tasting.status]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dina provningar</h1>
        <Link
          href="/admin/tastings/new"
          className="btn-primary"
        >
          Ny provning
        </Link>
      </div>
      <Suspense
        fallback={
          <LoadingStatus className="mt-6 min-h-11">
            Laddar provningar …
          </LoadingStatus>
        }
      >
        <TastingList />
      </Suspense>
    </main>
  );
}
