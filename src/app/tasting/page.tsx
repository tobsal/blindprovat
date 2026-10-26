import { Suspense } from "react";
import { getParticipantView } from "@/api/participant-tasting";
import { LoadingStatus } from "@/app/_components/loading-status";

async function TastingOverview() {
  const { displayName, tastingName } = await getParticipantView();

  return (
    <>
      <h1 className="text-2xl font-semibold">{tastingName}</h1>
      <p className="mt-2 text-on-surface-variant">
        Du är med som {displayName}.
      </p>
      <p className="mt-6">
        Vinerna dyker upp här när den som håller i provningen öppnar dem.
      </p>
    </>
  );
}

export default function TastingPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 p-4">
      <Suspense
        fallback={
          <LoadingStatus className="min-h-11">Laddar provningen …</LoadingStatus>
        }
      >
        <TastingOverview />
      </Suspense>
    </main>
  );
}
