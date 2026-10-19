// Laddningstext som skärmläsare annonserar när den visas.
export function LoadingStatus({
  children = "Laddar …",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <p role="status" className={className}>
      {children}
    </p>
  );
}
