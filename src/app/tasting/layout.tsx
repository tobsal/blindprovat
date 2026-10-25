import { Suspense } from "react";
import { requireParticipant } from "@/api/participant-session";
import { LoadingStatus } from "@/app/_components/loading-status";

// Med cacheComponents får sessionen (cookies) bara läsas inom Suspense.
async function ParticipantGuard({ children }: { children: React.ReactNode }) {
  await requireParticipant();
  return <>{children}</>;
}

export default function TastingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-outline-variant bg-surface-low px-4 py-3">
        <p className="text-lg font-semibold">Blindprovat</p>
      </header>
      <Suspense fallback={<LoadingStatus className="p-4" />}>
        <ParticipantGuard>{children}</ParticipantGuard>
      </Suspense>
    </div>
  );
}
