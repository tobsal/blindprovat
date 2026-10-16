import Link from "next/link";
import { CreateTastingForm } from "./create-tasting-form";

export default function NewTastingPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 p-6">
      <h1 className="text-2xl font-semibold">Ny provning</h1>
      <CreateTastingForm />
      <Link
        href="/admin"
        className="mt-6 inline-flex min-h-11 items-center underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Till dina provningar
      </Link>
    </main>
  );
}
