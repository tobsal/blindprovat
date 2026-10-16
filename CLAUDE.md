# CLAUDE.md – Blindprovat

## Vad projektet gör

Blindprovat är en webbapp för att arrangera **blindprovningar av vin** i grupp.

- **Administratören** (den som håller i provningen) skapar en provning, lägger in vinerna och delar en kod. Under provningen öppnar och stänger administratören viner för betygsättning, och avslöjar till sist vilka vinerna var och hur gruppen röstade.
- **Deltagarna** går med från mobilen via kod, utan konto. De ser bara blindnummer (Vin 1, Vin 2 …), sätter betyg och skriver anteckningar per vin.

### Problemet som löses

Vinprovningar sköts i dag med papper, Excel eller gruppchattar. Det är krångligt att hålla det blint, att samla in allas betyg och att räkna ut resultatet. Appar som Vivino är byggda för att logga enskilda viner, inte för att driva ett provningstillfälle med flera deltagare.

### Användare

1. **Admin** – inloggad, oftast på dator eller surfplatta.
2. **Deltagare** – anonym, på mobil, med kort tålamod. Flödet måste fungera med en hand och dålig uppkoppling.

### Domänbegrepp

- **Provning** (tasting) har en ägare (admin), en delbar kod och en status: `draft` (förbereds), `live` (pågår) eller `revealed` (avslöjad). Statusen går bara framåt i den ordningen.
- **Vin** tillhör en provning och har ett blindnummer som är det enda deltagare får se före avslöjandet. Admin öppnar och stänger varje vin för betygsättning.
- **Deltagare** går med i en provning utan konto och identifieras av en session. Sessionen gäller bara den provningen.
- **Betyg** är en deltagares bedömning av ett vin (poäng, anteckning och eventuellt tagg och gissning). En deltagare har högst ett betyg per vin och kan ändra det så länge vinet är öppet.

## Teknikstack och varför

| Del | Val | Varför |
|---|---|---|
| Ramverk | **Next.js (App Router)** | En kodbas för båda klienterna och servern. Välkända konventioner som agenter hanterar bra. |
| Språk | **TypeScript (strict)** | Typfel fångar misstag tidigt. Delade typer mellan klient och server. |
| Databas | **PostgreSQL på Neon** (free tier) | Gratis, permanent och skalar till noll. Vanlig Postgres, ingen inlåsning. |
| ORM | **Drizzle ORM + drizzle-kit** | Typat schema i TypeScript, SQL-nära och tydliga migrationer. |
| Validering | **Zod** | Validerar all input vid systemgränsen och ger typer på köpet. |
| Admininloggning | **Auth.js** med GitHub som provider | Ingen e-posttjänst behövs, gratis. |
| Styling | **Tailwind CSS** | Snabbt att bygga mobilanpassat utan egen CSS-arkitektur. |
| Enhetstester | **Vitest** | Snabb återkoppling för domänlogik. |
| E2E-tester | **Playwright** | Agenten kan själv verifiera hela flöden i webbläsaren. |
| Hosting | **Vercel Hobby** | Automatisk deploy vid push och preview-deploy per PR. |
| CI | **GitHub Actions** | Typkontroll, lint och tester måste vara gröna innan merge. |
| Pakethanterare | **npm** | Följer med Node, inget extra att installera. Fantomberoenden fångas av ESLint (se nedan). |

## Kommandon

```bash
npm install             # installera beroenden
npm run dev             # starta lokalt på http://localhost:3000
npm run build           # produktionsbygge
npm run lint            # ESLint
npm run typecheck       # tsc --noEmit
npm test                # Vitest (enhetstester)
npm run test:db         # Vitest mot migrerad databas (*.db.test.ts, kräver DATABASE_URL)
npm run test:e2e        # Playwright (kräver att appen kan startas)
npm run db:generate     # generera migration från ändrat schema
npm run db:migrate      # kör migrationer mot DATABASE_URL
npm run db:seed         # fyll databasen med demodata
```

Kör alltid `npm run typecheck && npm run lint && npm test` innan du säger att en uppgift är klar.

### Beroenden

- Använd bara **npm**. Den enda lockfilen är `package-lock.json`. Skapa aldrig `pnpm-lock.yaml` eller `yarn.lock`.
- I CI används `npm ci`, inte `npm install`.
- ESLint-regeln `import/no-extraneous-dependencies` är aktiverad som `error`. Den hindrar import av paket som inte står i `package.json` (fantomberoenden). Paket som bara används i tester, konfiguration och skript ska ligga i `devDependencies`.

## Struktur och lager

Koden ligger under `src/` och är indelad i lager. Följ befintlig placering i repot och leta upp rätt plats innan du skapar nya mappar. Beroenden går bara nedåt i listan:

1. **Presentation** (sidor, layouts, komponenter). Admin- och deltagarklienten hålls isär, med egna layouts och egen behörighetskontroll. Komponenter som bara används i en vy ligger bredvid vyn, bara verkligt delade komponenter läggs i en gemensam plats.
2. **Gränssnitt mot servern** (serveranrop för skrivningar och läsningar). Tunna lager som validerar, kontrollerar behörighet och delegerar.
3. **Dataåtkomst.** Enda stället som pratar med databasen. Exponerar separata funktioner och returtyper för admin och deltagare, så att deltagarvarianten inte kan returnera mer än den får visa.
4. **Domän** (ren affärslogik och domäntyper). Beror inte på något av lagren ovan.

Utöver lagren gäller:

- **Datamodellen** definieras på ett enda ställe. Domänlogiken får gärna arbeta direkt på typer härledda från datamodellen. Inför en separat mappning till egna domäntyper först när lagringsformen faktiskt börjar skapa problem.
- **Valideringsregler** delas mellan formulär och server och ligger separat från både UI och lagring.
- **Konfiguration** och **autentisering/sessioner** hålls samlade och undviker spridda direktuppslag i koden. Skapa dock ingen egen modul eller abstraktion för det förrän det behövs.
- **Enhetstester** ligger bredvid koden de testar. **E2E-tester** ligger separat från källkoden.
- **Migrationer** är genererade av verktyget och redigeras inte för hand.
- Lagergränserna ska så långt möjligt upprätthållas av lintregler, inte bara av den här texten.

## Arkitekturprinciper

1. **Domänlogiken är ren.** Domänlagret består av rena funktioner utan I/O, utan ramverksberoenden och utan databas. Resultatberäkning (snitt, rankning, spridning, närmast gruppen) ska gå att testa med vanliga objekt.
2. **All databasåtkomst sker i dataåtkomstlagret.** Presentation och serveranrop anropar det, aldrig databasen direkt.
3. **Serveranrop är tunna.** De validerar input, kontrollerar behörighet, anropar domän och dataåtkomst och returnerar resultatet. Ingen affärslogik där.
4. **Validera allt som kommer utifrån** vid gränsen: formulär, query-parametrar, cookies och sökvägsparametrar.
5. **Blindheten skyddas på servern.** Vinets riktiga namn, producent och andra detaljer skickas aldrig till deltagarklienten innan provningen har status `revealed`. Det får inte räcka att dölja det i UI:t.
6. **Behörighet kontrolleras på servern för varje anrop.** Admin får bara se och ändra sina egna provningar. En deltagare får bara läsa och skriva sina egna betyg i den provning sessionstoken gäller för.
7. **Rendera på servern som standard.** Använd klientkod bara där interaktivitet krävs.
8. **Realtid via polling.** Deltagare och admin hämtar status var 3–5 sekund via ett enkelt läsanrop. Byt inte till push-baserad kommunikation eller tredjepartstjänst utan att fråga.
9. **Funktioner gör en sak** och har beskrivande namn. Inga globala muterbara variabler.
10. **Mobil först för deltagarklienten.** Stora tryckytor och fungerande utan hovring.
11. **YAGNI.** Bygg bara det som uppgiften kräver nu. Inga abstraktioner, konfigurationsmöjligheter, generella hjälpklasser eller extra lager för tänkbara framtida behov. Duplicera hellre två gånger än att abstrahera i förväg, och bryt ut först när mönstret återkommer och är tydligt.
12. **Anonym åtkomst skyddas mot gissning.** Provningskoden ska vara slumpmässig och tillräckligt lång för att inte gå att gissa fram, aldrig löpnummer eller härledd från namn eller datum. 

13. **Tillgänglighet är ett krav, inte en finish.** Målet är WCAG 2.2 AA i både admin- och deltagarvyer.
    - Använd semantisk HTML (`button`, `label`, rubriknivåer, listor) före ARIA. Varje formulärfält har en synlig `label`.
    - Allt går att använda med tangentbord och har synlig fokusmarkering. Tryckytor är minst 44×44 px.
    - Kontrasten är minst 4,5:1 för text. Betyg, status och fel förmedlas aldrig bara med färg.
    - Fel och statusändringar som sker utan sidladdning (till exempel att ett vin öppnas eller stängs vid polling) annonseras med `aria-live` eller `role="alert"`. Polling får inte flytta fokus eller nollställa pågående inmatning.
    - Respektera `prefers-reduced-motion`. Blockera inte zoom.
    - Lägg inte till verktyg för automatisk tillgänglighetstestning (till exempel axe) utan att fråga, eftersom det är ett nytt beroende.
14. **Fel hanteras med felsidor och begripliga meddelanden.**
    - Använd Next.js felkonventioner: `not-found.tsx`, `error.tsx` per vy (admin och deltagare var för sig) och `global-error.tsx` som sista skyddsnät. Texterna är på svenska och erbjuder alltid en väg vidare (försök igen eller tillbaka till start).
    - Felsidor och felmeddelanden visar aldrig stacktrace, SQL, interna id:n eller vininformation. En ogiltig, utgången eller saknad provning ger samma allmänna meddelande, och en provning som någon annan äger ger samma svar som en som inte finns.
    - Serveranrop returnerar typade fel (till exempel valideringsfel per fält, saknad behörighet, ogiltigt tillstånd) som UI:t visar på svenska vid rätt fält. Oväntade fel kastas och fångas av närmaste `error.tsx`.
    - Deltagarklienten behåller det som skrivits in när ett anrop misslyckas, och skiljer på "ingen uppkoppling" och "något gick fel hos oss".
    - Logga oväntade fel på servern med tillräckligt sammanhang för att felsöka, men aldrig hemligheter, sessionstoken, anteckningar eller vininformation.

## Språk

- **Svenska** för allt användaren ser (UI-texter, felmeddelanden, tomma tillstånd), för dokumentation, kommentarer, commit-meddelanden och PR-beskrivningar.
- **Engelska** för kodidentifierare (variabler, funktioner, typer, filnamn). Domänbegrepp får sitt engelska namn i koden, till exempel `tasting` och `blindNumber`.

## Gör INTE detta

- Byt inte databas, ORM, ramverk, hostingplattform eller auth-lösning.
- Lägg inte till nya npm-beroenden utan att fråga först. Förklara varför och vilket alternativ utan beroende som finns.
- Rör inte `.env*`-filer och skriv aldrig hemligheter i kod, tester, loggar eller commits. Nya miljövariabler dokumenteras i `.env.example`.
- Redigera eller ta inte bort befintliga migrationer. Ändra schemat och generera en ny migration.
- Kör inga destruktiva databaskommandon (drop, truncate, reset) mot något annat än en lokal databas.
- Exponera inte vininformation till deltagare före avslöjandet (se princip 5).
- Inaktivera, hoppa över eller ta inte bort tester för att få bygget grönt. Laga orsaken.
- Använd inte `any`, `@ts-ignore` eller `eslint-disable` utan en kommentar som motiverar det.
- Gör inte stora omskrivningar eller "passande" refaktoreringar utanför uppgiften.
- Pusha inte direkt till `main`.

## Arbetssätt för agenten

1. **Läs först.** Läs relevant kod och denna fil innan du ändrar något.
2. **Planera.** Vid uppgifter som berör mer än ett par filer: skriv en kort plan och vänta på godkännande.
3. **Små steg.** En feature eller fix per branch och PR. Branchnamn: `feat/…`, `fix/…`, `chore/…`.
   - **Commit-meddelanden** börjar med samma typ som branchen (`feat:`, `fix:`, `chore:`), följt av en kort sammanfattning i imperativ (högst ca 72 tecken). Förklara varför, inte bara vad, i brödtexten när det inte är självklart. En logisk ändring per commit.
   - **PR-beskrivningen** tar upp vad som ändrats och varför, hur det testats (kommandon och eventuella manuella steg) och vad som är osäkert eller återstår. PR:en ska vara liten nog att granska i ett svep och får inte mergas med röd CI.
4. **Test tillsammans med kod.** Ny domänlogik får enhetstester. Nya användarflöden får minst ett e2e-test för lyckad väg.
5. **Verifiera själv.** Kör kommandona ovan och läs felmeddelanden innan du rapporterar att något är klart.
6. **Rapportera kort.** Vad som ändrats, hur det testats och vad som återstår eller är osäkert.
7. **Fråga hellre än gissa** när krav är otydliga eller när ett beslut är svårt att ångra.

### Definition of done

- [ ] `npm run typecheck`, `npm run lint` och `npm test` är gröna
- [ ] Nytt beteende har tester
- [ ] Inga nya beroenden utan godkännande
- [ ] Ingen vininformation läcker till deltagare före avslöjande
- [ ] Fungerar i mobilbredd (375 px) för deltagarvyer
- [ ] Nya vyer kan användas med tangentbord och uppfyller tillgänglighetskraven (princip 13)
- [ ] Nya felvägar har svenska felmeddelanden och läcker inget (princip 14)
- [ ] CI är grön och preview-deployen fungerar
