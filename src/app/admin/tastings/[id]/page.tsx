import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LoadingStatus } from "@/app/_components/loading-status";
import { TastingResults } from "@/app/_components/tasting-results";
import {
  getMyTasting,
  getMyTastingResults,
  type AdminWine,
} from "@/api/admin-tastings";
import { canAddWines, canOpenWines } from "@/domain/tasting";
import { tastingStatusLabels } from "../../tasting-status";
import { AddWineForm } from "./add-wine-form";
import { DeleteTastingButton } from "./delete-tasting-button";
import { TastingStatusControl } from "./tasting-status-control";
import { WineOpenToggle } from "./wine-open-toggle";

function describeWine(wine: AdminWine): string {
  return [wine.name, wine.producer, wine.vintage ?? "Årgångslöst"]
    .filter(Boolean)
    .join(", ");
}

async function TastingDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tasting = await getMyTasting(id);
  if (!tasting) notFound();
  const results = await getMyTastingResults(tasting.id);

  return (
    <>
      <h1 className="text-2xl font-semibold">{tasting.name}</h1>
      <p className="mt-2">Status: {tastingStatusLabels[tasting.status]}</p>
      <TastingStatusControl
        tastingId={tasting.id}
        status={tasting.status}
        wineCount={tasting.wines.length}
      />

      {results && (
        <section aria-labelledby="results-heading" className="mt-6">
          <h2 id="results-heading" className="text-lg font-semibold">
            Resultat
          </h2>
          <div className="mt-2">
            <TastingResults results={results} />
          </div>
        </section>
      )}

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
          <ol className="mt-2 divide-y divide-outline-variant overflow-hidden rounded-2xl bg-surface-low">
            {tasting.wines.map((wine) => (
              <li key={wine.id} className="px-4 py-3">
                <span className="font-medium">Vin {wine.blindNumber}</span> –{" "}
                {describeWine(wine)}
                {canOpenWines(tasting.status) && (
                  <WineOpenToggle
                    wineId={wine.id}
                    blindNumber={wine.blindNumber}
                    isOpen={wine.isOpen}
                  />
                )}
              </li>
            ))}
          </ol>
        )}
        {canAddWines(tasting.status) ? (
          <AddWineForm tastingId={tasting.id} />
        ) : (
          <p className="mt-4">
            Viner kan bara läggas till innan provningen startar.
          </p>
        )}
      </section>

      <section
        aria-labelledby="delete-heading"
        className="mt-8 flex flex-col gap-2"
      >
        <h2 id="delete-heading" className="text-lg font-semibold">
          Ta bort
        </h2>
        <p>Tar bort provningen med alla viner, deltagare och betyg.</p>
        <DeleteTastingButton tastingId={tasting.id} status={tasting.status} />
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
          <LoadingStatus className="min-h-11">
            Laddar provningen …
          </LoadingStatus>
        }
      >
        <TastingDetails params={params} />
      </Suspense>

      <Link href="/admin" className="link-action mt-8">
        Till dina provningar
      </Link>
    </main>
  );
}
