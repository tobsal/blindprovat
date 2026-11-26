import { Suspense } from "react";
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
    <LiveWineRating
      blindNumber={wine.blindNumber}
      initialIsOpen={wine.isOpen}
      type={wine.type}
      initial={wine.rating}
      previousBlindNumber={wine.previousBlindNumber}
      nextBlindNumber={wine.nextBlindNumber}
    />
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
