"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 4000;

// Hämtar sidan på nytt med jämna mellanrum så att nya viner och ändrad status
// syns utan omladdning. Det är en vanlig serverläsning, och Next byter bara
// ut det som ändrats, så fokus och pågående inmatning rörs inte.
export function PollRefresh() {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}
