import type {
  ResultsParticipant,
  ResultsView,
  ResultsWine,
} from "@/api/tasting-results";
import { SCORE_MAX } from "@/domain/rating";

const numberFormat = new Intl.NumberFormat("sv-SE", {
  maximumFractionDigits: 1,
});

function describeWine({ details }: ResultsWine): string {
  return [details.producer, details.vintage ?? "Årgångslöst"]
    .filter(Boolean)
    .join(", ");
}

function WineRow({ wine }: { wine: ResultsWine }) {
  const { rating } = wine;
  return (
    <li className="px-4 py-3">
      <p className="text-sm text-on-surface-variant">
        {rating ? `Plats ${rating.rank}` : "Ingen placering"} · Vin{" "}
        {wine.blindNumber}
      </p>
      <p className="text-base font-medium">{wine.details.name}</p>
      <p className="text-sm text-on-surface-variant">{describeWine(wine)}</p>
      <p className="mt-1 text-sm">
        {rating
          ? `Snitt ${numberFormat.format(rating.average)} av ${SCORE_MAX} · lägst ${rating.lowest} · högst ${rating.highest} · ${rating.count} betyg`
          : "Inga betyg"}
      </p>
      {wine.ownScore !== null && (
        <p className="mt-1 text-sm font-medium">
          Ditt betyg: {wine.ownScore} av {SCORE_MAX}
        </p>
      )}
    </li>
  );
}

function ParticipantRow({ participant }: { participant: ResultsParticipant }) {
  const name = participant.isSelf
    ? `${participant.displayName} (du)`
    : participant.displayName;
  return (
    <li className="px-4 py-3">
      <p className="text-sm text-on-surface-variant">
        {participant.rank !== null
          ? `Plats ${participant.rank}`
          : "Ingen placering"}
      </p>
      <p className="text-base font-medium">{name}</p>
      <p className="text-sm">
        {participant.meanDeviation !== null
          ? `I snitt ${numberFormat.format(participant.meanDeviation)} poäng från gruppen (${participant.comparedWineCount} viner)`
          : "För få betyg för att jämföras"}
      </p>
    </li>
  );
}

const listClass =
  "mt-2 divide-y divide-outline-variant overflow-hidden rounded-2xl bg-surface-low";

export function TastingResults({ results }: { results: ResultsView }) {
  const hasRatings = results.wines.some((wine) => wine.rating !== null);
  if (!hasRatings) return <p>Inga betyg lämnades i provningen.</p>;

  return (
    <>
      <section aria-labelledby="results-wines-heading">
        <h3 id="results-wines-heading" className="text-base font-semibold">
          Vinerna
        </h3>
        <ol className={listClass}>
          {results.wines.map((wine) => (
            <WineRow key={wine.blindNumber} wine={wine} />
          ))}
        </ol>
      </section>

      <section aria-labelledby="results-participants-heading" className="mt-6">
        <h3
          id="results-participants-heading"
          className="text-base font-semibold"
        >
          Närmast gruppen
        </h3>
        <ol className={listClass}>
          {results.participants.map((participant) => (
            <ParticipantRow
              key={participant.displayName}
              participant={participant}
            />
          ))}
        </ol>
      </section>
    </>
  );
}
