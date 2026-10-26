// Felruta som annonseras direkt när den visas. Felet förmedlas med ordet
// "Fel" och en kantlinje, aldrig bara med färg.
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-error px-3 py-2 text-error"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="mt-0.5 shrink-0"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16.5h.01" />
      </svg>
      <span>
        <strong>Fel:</strong> {children}
      </span>
    </p>
  );
}
