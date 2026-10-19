"use client";

import { ErrorPage } from "../_components/error-page";

export default function AdminError({ reset }: { reset: () => void }) {
  return <ErrorPage reset={reset} />;
}
