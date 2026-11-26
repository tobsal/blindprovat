import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasJoinedTasting } from "@/api/participant-tasting";
import { LoadingStatus } from "@/app/_components/loading-status";
import { tastingCodeSchema } from "@/validation/participant";
import { ActiveSession } from "./active-session";
import { JoinForm } from "./join-form";

// Koden i en deltagarlänk fylls i åt besökaren. En ogiltig kod ignoreras. Den
// som redan är med i länkens provning skickas dit i stället för att mötas av
// formuläret och få veta att namnet redan används.
async function LinkedJoinForm({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const code = tastingCodeSchema.safeParse((await searchParams).code);
  if (!code.success) return <JoinForm />;
  if (await hasJoinedTasting(code.data)) redirect("/tasting");
  return <JoinForm linkedCode={code.data} />;
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Blindprovat</h1>
        <p className="text-on-surface-variant">
          Gå med i en blindprovning av vin med koden du fått.
        </p>
      </div>
      {/* Med cacheComponents får sessionen (cookies) bara läsas inom Suspense. */}
      <Suspense fallback={null}>
        <ActiveSession />
      </Suspense>
      {/* Laddningsstatus i stället för ett tomt formulär, så att inget hinner
          skrivas i ett formulär som sedan byts ut. */}
      <Suspense
        fallback={
          <LoadingStatus className="min-h-11">
            Laddar formuläret …
          </LoadingStatus>
        }
      >
        <LinkedJoinForm searchParams={searchParams} />
      </Suspense>
      <Link href="/login" className="link-action">
        För dig som håller i en provning: logga in
      </Link>
    </main>
  );
}
