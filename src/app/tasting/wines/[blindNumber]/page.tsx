import { Suspense } from "react";
import Link from "next/link";
import { getParticipantWine } from "@/api/participant-wine";
import { LoadingStatus } from "@/app/_components/loading-status";
import { LiveWineRating } from "./live-wine-rating";

async function WineRating({
  params,
}: {
  params: Promise<{ blindNumber: string }>;
}) {
  const { blindNumber } = await params;
  const wine = await getParticipantWine(blindNumber);

  return (
    <>
      <LiveWineRating
        blindNumber={wine.blindNumber}
        initialIsOpen={wine.isOpen}
        type={wine.type}
        initial={wine.rating}
      />

      <nav
        aria-label="Byt vin"
        className="mt-8 flex flex-wrap justify-between gap-3"
      >
        {wine.previousBlindNumber !== null ? (
          <Link
            href={`/tasting/wines/${wine.previousBlindNumber}`}
            className="btn-secondary"
          >
            Föregående vin
          </Link>
        ) : (
          <span />
        )}
        {wine.nextBlindNumber !== null && (
          <Link
            href={`/tasting/wines/${wine.nextBlindNumber}`}
            className="btn-secondary"
          >
            Nästa vin
          </Link>
        )}
      </nav>
    </>
  );
}

export default function WinePage({
  params,
}: PageProps<"/tasting/wines/[blindNumber]">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 p-4">
      <Suspense
        fallback={
          <LoadingStatus className="min-h-11">Laddar vinet …</LoadingStatus>
        }
      >
        <WineRating params={params} />
      </Suspense>
    </main>
  );
}
