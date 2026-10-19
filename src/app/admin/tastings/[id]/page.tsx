import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
<<<<<<< HEAD
import { getMyTasting, type AdminWine } from "@/api/admin-tastings";
=======
import { getMyTasting, type AdminTastingWithWines } from "@/api/admin-tastings";
import { canAddWines } from "@/domain/tasting";
import { LoadingStatus } from "@/app/_components/loading-status";
>>>>>>> origin/main
import { tastingStatusLabels } from "../../tasting-status";
import { AddWineForm } from "./add-wine-form";

function describeWine(wine: AdminWine): string {
  return [wine.name, wine.producer, wine.vintage ?? "Årgångslöst"]
    .filter(Boolean)
    .join(", ");
}

async function TastingDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tasting = await getMyTasting(id);
  if (!tasting) notFound();

  return (
    <>
      <h1 className="text-2xl font-semibold">{tasting.name}</h1>
      <p className="mt-2">Status: {tastingStatusLabels[tasting.status]}</p>

      <section aria-labelledby="code-heading" className="mt-6">
        <h2 id="code-heading" className="text-lg font-semibold">
          Provningskod
        </h2>
        <p className="mt-1">Dela koden med deltagarna.</p>
        <p
          className="mt-2 font-mono text-3xl tracking-widest"
          data-testid="tasting-code"
        >
          {tasting.code}
        </p>
      </section>

      <section aria-labelledby="wines-heading" className="mt-8">
        <h2 id="wines-heading" className="text-lg font-semibold">
          Viner
        </h2>
        {tasting.wines.length === 0 ? (
          <p className="mt-2">Inga viner tillagda än.</p>
        ) : (
          <ol className="mt-2 divide-y divide-foreground/30 border-y border-foreground/30">
            {tasting.wines.map((wine) => (
              <li key={wine.id} className="py-3">
                <span className="font-medium">Vin {wine.blindNumber}</span> –{" "}
                {describeWine(wine)}
              </li>
            ))}
          </ol>
        )}
        {canAddWines(tasting.status) ? (
          <AddWineForm tastingId={tasting.id} />
        ) : (
          <p className="mt-4">
            Provningen har startat, så inga fler viner kan läggas till.
          </p>
        )}
      </section>
    </>
  );
}

export default function TastingPage({
  params,
}: PageProps<"/admin/tastings/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <Suspense
        fallback={
          <LoadingStatus className="min-h-11">Laddar provningen …</LoadingStatus>
        }
      >
        <TastingDetails params={params} />
      </Suspense>

      <Link
        href="/admin"
        className="link-action mt-8"
      >
        Till dina provningar
      </Link>
    </main>
  );
}
