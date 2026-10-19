"use client";

import "./globals.css";
import { ErrorPage } from "./_components/error-page";

// Sista skyddsnätet när själva rotlayouten kraschar. Layouten renderas inte
// här, så sidan har egen html och body.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ErrorPage reset={reset} />
      </body>
    </html>
  );
}
