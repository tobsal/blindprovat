import { systembolagetUrl } from "@/domain/wine";

// Numret visas följt av en länk till Systembolagets sökning. Länken öppnas
// i ny flik, så att deltagaren inte tappar resultatet på mobilen. Det
// annonseras för skärmläsare, eftersom länktexten inte säger det.
export function SystembolagetLink({
  articleNumber,
}: {
  articleNumber: string;
}) {
  return (
    <>
      Artikelnummer {articleNumber} ·{" "}
      <a
        href={systembolagetUrl(articleNumber)}
        target="_blank"
        rel="noopener noreferrer"
        className="link-action"
      >
        Hitta vinet på Systembolaget
        <span className="sr-only"> (öppnas i ny flik)</span>
      </a>
    </>
  );
}
