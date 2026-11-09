"use client";

import { useFormStatus } from "react-dom";

// Skickaknapp för formulär som postar till ett serveranrop utan
// useActionState. Visar pendingLabel och spärrar nya klick medan anropet
// pågår, eftersom ett andra klick annars startar en ny omdirigering.
export function PendingSubmitButton({
  pendingLabel,
  className,
  children,
}: {
  pendingLabel: string;
  className: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
