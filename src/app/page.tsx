import Link from "next/link";
import { JoinForm } from "./join-form";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Blindprovat</h1>
        <p className="text-on-surface-variant">
          Gå med i en blindprovning av vin med koden du fått.
        </p>
      </div>
      <JoinForm />
      <Link href="/login" className="link-action">
        För dig som håller i en provning: logga in
      </Link>
    </main>
  );
}
