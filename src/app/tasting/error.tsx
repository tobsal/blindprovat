"use client";

import { ErrorPage } from "../_components/error-page";

export default function TastingError({ reset }: { reset: () => void }) {
  return <ErrorPage reset={reset} />;
}
