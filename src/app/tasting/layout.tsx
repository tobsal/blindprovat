import { Suspense } from "react";
import Link from "next/link";
import { requireParticipant } from "@/api/participant-session";
import { LoadingStatus } from "@/app/_components/loading-status";
import { ParticipantName } from "./participant-name";

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
      <header className="flex flex-wrap items-center justify-between gap-x-3 border-b border-outline-variant bg-surface-low px-4 py-1">
        <Link
          href="/tasting"
          className="inline-flex min-h-11 items-center text-lg font-semibold"
        >
          Blindprovat
        </Link>
        <Suspense fallback={null}>
          <ParticipantName />
        </Suspense>
      </header>
      <Suspense fallback={<LoadingStatus className="p-4" />}>
        <ParticipantGuard>{children}</ParticipantGuard>
      </Suspense>
    </div>
  );
}
