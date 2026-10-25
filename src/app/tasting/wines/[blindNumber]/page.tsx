import { Suspense } from "react";
import Link from "next/link";
import { getParticipantWine } from "@/api/participant-wine";
import { LoadingStatus } from "@/app/_components/loading-status";
import { PollRefresh } from "../../poll-refresh";
import { RatingForm } from "./rating-form";

async function WineRating({
  params,
}: {
  params: Promise<{ blindNumber: string }>;
}) {
  const { blindNumber } = await params;
  const wine = await getParticipantWine(blindNumber);

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href="/tasting"
          aria-label="Tillbaka till alla viner"
          className="-ml-2 flex size-12 shrink-0 items-center justify-center rounded-full"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-2xl font-semibold">
          Vin {wine.blindNumber}
        </h1>
        <span className="rounded-lg bg-surface-high px-3 py-1 text-sm font-medium">
          {wine.isOpen ? "Öppet för betyg" : "Stängt"}
        </span>
      </div>

      <div className="mt-4">
        <RatingForm
          blindNumber={wine.blindNumber}
          isOpen={wine.isOpen}
          initial={wine.rating}
        />
      </div>

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
      <PollRefresh />
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
