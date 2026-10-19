import Link from "next/link";
import { CreateTastingForm } from "./create-tasting-form";

export default function NewTastingPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 p-6">
      <h1 className="text-2xl font-semibold">Ny provning</h1>
      <CreateTastingForm />
      <Link
        href="/admin"
        className="link-action mt-6"
      >
        Till dina provningar
      </Link>
    </main>
  );
}
