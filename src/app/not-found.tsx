import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Sidan finns inte</h1>
      <p>
        Vi hittar ingen sida på den här adressen. Kontrollera adressen eller gå
        till startsidan.
      </p>
      <Link
        href="/"
        className="btn-secondary self-start"
      >
        Till startsidan
      </Link>
    </main>
  );
}
