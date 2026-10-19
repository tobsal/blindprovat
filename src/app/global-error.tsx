"use client";

import "./globals.css";

// Sista skyddsnätet när själva rotlayouten kraschar. Layouten renderas inte
// här, så sidan har egen html och body. En vanlig länk används eftersom
// routern kan vara trasig.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-4 p-6">
          <h1 className="text-2xl font-semibold">Något gick fel</h1>
          <p role="alert">
            Det gick inte att visa sidan just nu. Försök igen om en stund.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="min-h-11 rounded bg-foreground px-4 text-background focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Försök igen
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- routern kan vara trasig i global-error */}
            <a
              href="/"
              className="inline-flex min-h-11 items-center rounded border border-foreground px-4 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Till startsidan
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
