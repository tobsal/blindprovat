"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { POLL_INTERVAL_MS } from "@/domain/tasting";

function subscribeToConnection(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

// Om webbläsaren har uppkoppling. På servern antas den ha det.
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    subscribeToConnection,
    () => navigator.onLine,
    () => true,
  );
}

// Hämtar sidan på nytt med jämna mellanrum så att nya viner och ändrad status
// syns utan omladdning. Det är en vanlig serverläsning, och Next byter bara
// ut det som ändrats. Används bara på sidor utan inmatning: misslyckas
// läsningen visas felsidan, och utan uppkoppling gör Next en hel sidladdning.
// Därför hoppas läsningen över utan uppkoppling.
export function PollRefresh() {
  const router = useRouter();
  const isOnline = useIsOnline();

  useEffect(() => {
    if (!isOnline) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router, isOnline]);

  return (
    <p role="status" className="mt-6 text-xs text-on-surface-variant">
      {isOnline
        ? "Sidan uppdateras automatiskt."
        : "Ingen uppkoppling. Sidan uppdateras när du är uppkopplad igen."}
    </p>
  );
}
