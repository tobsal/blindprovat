import Link from "next/link";
import { getActiveTastingName } from "@/api/participant-tasting";

// Vägen tillbaka för den som redan är med i en provning. Utan session visas
// ingenting.
export async function ActiveSession() {
  const tastingName = await getActiveTastingName();
  if (tastingName === null) return null;

  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/tasting"
        className="btn-primary py-2 text-center wrap-anywhere"
      >
        Fortsätt till {tastingName}
      </Link>
      <p className="text-sm wrap-anywhere text-on-surface-variant">
        Går du med i en annan provning lämnar du {tastingName}.
      </p>
    </div>
  );
}
