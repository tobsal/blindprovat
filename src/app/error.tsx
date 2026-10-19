"use client";

import { ErrorPage } from "./_components/error-page";

// Fångar fel i alla vyer under rotlayouten, även i adminlayouten (guard och
// användarmeny), som ligger utanför admin/error.tsx.
export default function RootError({ reset }: { reset: () => void }) {
  return <ErrorPage reset={reset} />;
}
