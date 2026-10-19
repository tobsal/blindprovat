// Felruta som annonseras direkt när den visas. Felet förmedlas med ordet
// "Fel" och en kantlinje, aldrig bara med färg.
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="border-l-4 border-foreground pl-3">
      <strong>Fel:</strong> {children}
    </p>
  );
}
