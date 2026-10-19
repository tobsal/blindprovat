import { Suspense } from "react";
import { requireAdminOwnerId } from "@/api/admin-session";
import { LoadingStatus } from "@/app/_components/loading-status";
import { UserMenu } from "./user-menu";

// Med cacheComponents får sessionen (cookies) bara läsas inom Suspense.
async function AdminGuard({ children }: { children: React.ReactNode }) {
  await requireAdminOwnerId();
  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground px-6 py-3">
        <p className="text-lg font-semibold">Blindprovat – admin</p>
        <Suspense fallback={null}>
          <UserMenu />
        </Suspense>
      </header>
      <Suspense
        fallback={
          <LoadingStatus className="p-6" />
        }
      >
        <AdminGuard>{children}</AdminGuard>
      </Suspense>
    </div>
  );
}
