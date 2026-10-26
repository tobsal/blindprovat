import { Suspense } from "react";
import Link from "next/link";
import {
  getParticipantView,
  type ParticipantWineView,
} from "@/api/participant-tasting";
import { LoadingStatus } from "@/app/_components/loading-status";
import { SCORE_MAX } from "@/domain/rating";
import { PollRefresh } from "./poll-refresh";
import { WineStateIcon } from "./wine-state-icon";

function statusText(wine: ParticipantWineView): string {
  const rated = `Betygsatt · ${wine.score} av ${SCORE_MAX}`;
  switch (wine.state) {
    case "open":
      return "Öppet · inte betygsatt än";
    case "open_rated":
      return `${rated} · öppet`;
    case "rated":
      return rated;
    case "waiting":
      return "Inte öppet";
  }
}

async function TastingOverview() {
  const { displayName, tastingName, status, wines } =
    await getParticipantView();
  const wineToRate = wines.find((wine) => wine.state === "open");

  return (
    <>
      <h1 className="text-2xl font-semibold">{tastingName}</h1>
      <p className="mt-1 text-on-surface-variant">
        {wines.length} viner · du är med som {displayName}
      </p>

      {/* Regionen finns alltid, så att skärmläsare annonserar när ett vin öppnas. */}
      <div aria-live="polite" className="mt-4">
        {wineToRate && (
          <section className="rounded-xl bg-primary p-4 text-on-primary">
            <h2 className="text-base font-medium">
              Vin {wineToRate.blindNumber} är öppet för betyg
            </h2>
            <p className="mt-1 text-sm">
              Sätt ditt betyg innan värden stänger vinet.
            </p>
            <Link
              href={`/tasting/wines/${wineToRate.blindNumber}`}
              className="mt-3 inline-flex min-h-12 items-center rounded-full bg-on-primary px-6 font-medium text-primary focus-visible:outline-on-primary"
            >
              Betygsätt vin {wineToRate.blindNumber}
            </Link>
          </section>
        )}
      </div>

      {status === "draft" && (
        <p className="mt-4">
          Provningen har inte startat än. Vinerna visas när den startar.
        </p>
      )}
      {status === "revealed" && <p className="mt-4">Provningen är avslöjad.</p>}

      {wines.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-medium text-on-surface-variant">
            Alla viner
          </h2>
          <ul className="mt-2 divide-y divide-outline-variant overflow-hidden rounded-2xl bg-surface-low">
            {wines.map((wine) => {
              const isOpen =
                wine.state === "open" || wine.state === "open_rated";
              const row = (
                <>
                  <span
                    aria-hidden="true"
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full font-medium ${
                      isOpen
                        ? "bg-primary text-on-primary"
                        : "bg-surface-high text-on-surface-variant"
                    }`}
                  >
                    {wine.blindNumber}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-base">Vin {wine.blindNumber}</span>
                    <span className="text-sm text-on-surface-variant">
                      {statusText(wine)}
                    </span>
                  </span>
                  <WineStateIcon state={wine.state} />
                </>
              );
              const rowClass = "flex min-h-18 items-center gap-4 px-4 py-3";
              return (
                <li key={wine.blindNumber}>
                  {wine.state === "waiting" ? (
                    <div className={rowClass}>{row}</div>
                  ) : (
                    <Link
                      href={`/tasting/wines/${wine.blindNumber}`}
                      className={`${rowClass} hover:bg-surface-high`}
                    >
                      {row}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="mt-6 text-xs text-on-surface-variant">
        Sidan uppdateras automatiskt.
      </p>
      <PollRefresh />
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
