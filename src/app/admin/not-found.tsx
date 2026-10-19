import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 p-6">
      <h1 className="text-2xl font-semibold">Provningen finns inte</h1>
      <p className="mt-4">
        Vi hittar ingen provning här. Den kan vara borttagen, eller så har du
        inte åtkomst till den.
      </p>
      <Link
        href="/admin"
        className="btn-secondary mt-6"
      >
        Till dina provningar
      </Link>
    </main>
  );
}
