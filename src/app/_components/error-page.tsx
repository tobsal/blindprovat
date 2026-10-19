"use client";

// Innehållet i en felsida, delat av error.tsx för admin och root och av
// global-error.tsx. Visar aldrig något om själva felet (princip 14).
export function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Något gick fel</h1>
      <p role="alert">
        Vi kunde inte visa sidan just nu. Försök igen om en stund.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="btn-primary"
        >
          Försök igen
        </button>
        {/* En vanlig länk ger en fullständig sidladdning. Efter ett fel kan routern vara trasig. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- routern kan vara trasig efter ett fel */}
        <a
          href="/"
          className="btn-secondary"
        >
          Till startsidan
        </a>
      </div>
    </main>
  );
}
