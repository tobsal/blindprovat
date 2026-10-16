"use client";

import Link from "next/link";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 p-6">
      <h1 className="text-2xl font-semibold">Något gick fel</h1>
      <p className="mt-4" role="alert">
        Vi kunde inte visa sidan just nu. Försök igen om en stund.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded bg-foreground px-4 text-background focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Försök igen
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded border border-foreground px-4 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Till startsidan
        </Link>
      </div>
    </main>
  );
}
