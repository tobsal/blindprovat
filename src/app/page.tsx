import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-3xl font-semibold">Blindprovat</h1>
      <p>Arrangera blindprovningar av vin i grupp.</p>
      <Link
        href="/login"
        className="link-action"
      >
        För dig som håller i en provning: logga in
      </Link>
    </main>
  );
}
