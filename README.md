# Blindprovat

[![CI](https://github.com/tobsal/blindprovat/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/tobsal/blindprovat/actions/workflows/ci.yml)

Webbapp för att arrangera blindprovningar av vin i grupp.

## Vad appen gör

Vinprovningar sköts ofta med papper, Excel eller gruppchattar. Då är det svårt att hålla provningen blind, samla in allas betyg och räkna ut resultatet. Blindprovat driver hela provningstillfället:

- **Den som håller i provningen (admin)** loggar in med GitHub, skapar en provning, lägger in vinerna och delar en kod. Under provningen öppnar och stänger admin varje vin för betygsättning. Till sist avslöjar admin vilka vinerna var och hur gruppen röstade.
- **Deltagarna** går med från mobilen med koden, utan konto. De ser bara blindnummer (Vin 1, Vin 2 …), sätter poäng och skriver anteckningar per vin. De kan ändra sitt betyg så länge vinet är öppet.

En provning går igenom tre steg, alltid i den här ordningen: **förbereds** (`draft`), **pågår** (`live`) och **avslöjad** (`revealed`).

## Teknikstack

| Del               | Val                                    |
| ----------------- | -------------------------------------- |
| Ramverk           | Next.js (App Router), React            |
| Språk             | TypeScript (strict)                    |
| Databas           | PostgreSQL, i produktion på Neon       |
| ORM och migration | Drizzle ORM och drizzle-kit            |
| Validering        | Zod                                    |
| Admininloggning   | Auth.js med GitHub                     |
| Styling           | Tailwind CSS                           |
| Tester            | Vitest (enhet och databas), Playwright |
| Formatering       | Prettier, ESLint                       |
| Hosting och CI    | Vercel, GitHub Actions                 |

## Arkitektur

Koden under `src/` är indelad i lager. Varje lager får bara bero på lagren under sig, och gränserna upprätthålls av lintregler.

| Lager             | Mapp                | Ansvar                                                                                                                                 |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Presentation      | `src/app/`          | Sidor och komponenter. Admin (`admin/`) och deltagare (`tasting/`) har egna layouts, felsidor och behörighetskontroll.                 |
| Serveranrop       | `src/api/`          | Tunna server actions och läsfunktioner som validerar input, kontrollerar behörighet och delegerar.                                     |
| Dataåtkomst       | `src/repositories/` | Enda stället som pratar med databasen. Här finns också schemat. Admin och deltagare har separata funktioner och returtyper.            |
| Domän             | `src/domain/`       | Ren affärslogik utan I/O, till exempel statusövergångar och resultatberäkning (snitt, rankning, spridning). Testas med vanliga objekt. |
| Valideringsregler | `src/validation/`   | Zod-scheman som delas mellan formulär och server.                                                                                      |

Några principer som styr designen:

- **Blindheten skyddas på servern.** Vinets namn, producent och andra detaljer skickas aldrig till deltagarna förrän provningen är avslöjad. Det räcker inte att dölja dem i gränssnittet, så deltagarvarianterna i dataåtkomstlagret returnerar dem inte ens.
- **Behörighet kontrolleras vid varje anrop.** En admin ser bara sina egna provningar. En deltagare identifieras av en sessionscookie som bara gäller en provning.
- **Realtid via polling.** Admin och deltagare hämtar status var 3–5 sekund. Det behövs ingen push-tjänst.
- **Rendering på servern som standard.** Klientkod används bara där det krävs interaktivitet.
- **Mobil först och tillgängligt.** Deltagarvyn är byggd för en hand och dålig uppkoppling. Målet är WCAG 2.2 AA i hela appen.

De fullständiga reglerna för koden, och för agenter som arbetar i repot, står i [CLAUDE.md](CLAUDE.md).

## Förutsättningar

- **Node.js 26** (CI kör 26.13). npm följer med Node.
- **PostgreSQL**, antingen lokalt eller på Neon:
  - Lokalt: installera PostgreSQL 17 eller kör det i Docker och skapa databasen `blindprovat`. Med Docker:
    ```bash
    docker run -d --name blindprovat-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=blindprovat -p 5432:5432 postgres:17
    ```
    Anslutningssträngen blir då `postgres://postgres:postgres@localhost:5432/blindprovat`.
  - Neon: skapa ett projekt (gärna en egen branch för utveckling) och använd den poolade anslutningssträngen.
- **En OAuth-app på GitHub** för admininloggningen. Hur du skapar den står i `.env.example`.

## Kom igång

1. Installera beroenden med `npm install`.
2. Kopiera `.env.example` till `.env.local` och fyll i värdena. Kommentarerna i `.env.example` beskriver varje variabel.
3. Kör migrationerna med `npm run db:migrate`.
4. Starta appen med `npm run dev` och öppna http://localhost:3000.

## Utvecklat med

Claude Code (agentdriven utveckling) som del av kursen "AI för utvecklare".

### Köra produktionsbygget lokalt

```powershell
npm run build
$env:AUTH_TRUST_HOST = 'true'
npm start
```

Auth.js litar bara automatiskt på värden i dev-läge och på Vercel. Utan `AUTH_TRUST_HOST` misslyckas admininloggningen i `npm start` med felet `UntrustedHost` i serverloggen. Sätt den inte på Vercel, där behövs den inte.

## Vem som kan logga in som admin

Alla med ett GitHub-konto kan logga in som admin. Det finns ingen lista över tillåtna konton. Varje admin ser och ändrar bara sina egna provningar, så att någon annan loggar in ger ingen åtkomst till dina. Deltagare loggar aldrig in, de går med via provningens kod.

## Tester och kontroller

| Kommando               | Vad det gör                                         |
| ---------------------- | --------------------------------------------------- |
| `npm test`             | Enhetstester (Vitest), ingen databas behövs         |
| `npm run test:db`      | Tester mot en migrerad databas (se nedan)           |
| `npm run test:e2e`     | E2E-tester i webbläsaren (Playwright)               |
| `npm run typecheck`    | Typkontroll                                         |
| `npm run lint`         | ESLint                                              |
| `npm run format:check` | Kontrollerar formateringen (`npm run format` fixar) |

Innan du öppnar en PR, kör `npm run format && npm run typecheck && npm run lint && npm test`. CI kör dessutom databas- och e2e-testerna.

E2E-testerna kräver `DATABASE_URL` och `AUTH_SECRET` i `.env.local` och en migrerad databas. Första gången behöver du också installera webbläsaren:

```bash
npx playwright install chromium
```

## Anslutningssträng till databasen i PowerShell

De flesta kommandon läser `DATABASE_URL` från `.env.local` själva:

| Kommando                                    | Läser `.env.local` |
| ------------------------------------------- | ------------------ |
| `npm run dev`, `npm run build`              | Ja                 |
| `npm run db:generate`, `npm run db:migrate` | Ja                 |
| `npm run test:e2e`                          | Ja                 |
| `npm run test:db`                           | **Nej**            |

Innan du kör `npm run test:db` måste du därför sätta `DATABASE_URL` i terminalen. Annars stoppar testerna med felet `DATABASE_URL saknas. Se .env.example.`

### Sätt variabeln för terminalfönstret

```powershell
$env:DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/blindprovat'
npm run test:db
```

- Använd enkla citattecken. Inom dubbla citattecken tolkar PowerShell `$` som en variabel, och lösenord i anslutningssträngar från Neon kan innehålla `$`.
- Variabeln gäller bara i det fönstret och försvinner när du stänger det. I ett nytt fönster måste du sätta den igen.
- Kontrollera vilken databas som är satt med `$env:DATABASE_URL`, och ta bort variabeln med `Remove-Item Env:DATABASE_URL`.

### Hämta variabeln från .env.local

Om du inte vill skriva in anslutningssträngen en gång till kan du låta Node läsa `.env.local` för en enda körning:

```powershell
node --env-file=.env.local node_modules/vitest/vitest.mjs run --config vitest.db.config.mts
```

### Vilken databas testerna körs mot

Databastesterna skapar provningar och tar bort dem efteråt, i den databas som `DATABASE_URL` pekar på.

- Kör helst mot en lokal databas eller en egen Neon-branch, inte mot en databas som andra använder.
- Databasen måste vara migrerad. Kör `npm run db:migrate` mot samma databas först.
- Kör aldrig destruktiva kommandon (drop, truncate, reset) mot något annat än en lokal databas.

## Drift

Appen körs på Vercel med databasen på Neon. Vercel deployar automatiskt från GitHub.

| Miljö      | När                          | Databas                                                  |
| ---------- | ---------------------------- | -------------------------------------------------------- |
| Production | push till `main`             | Neons huvudbranch                                        |
| Preview    | varje push till en PR-branch | en egen Neon-branch per preview, skapad av integrationen |

### Miljövariabler på Vercel

Sätts under Project > Settings > Environment Variables, separat för Production och Preview. Använd aldrig värdena från `.env.local`.

- `DATABASE_URL` och `DATABASE_URL_UNPOOLED` sätts av Neon-integrationen.
- `AUTH_SECRET` har ett eget värde per miljö.
- `AUTH_GITHUB_ID` och `AUTH_GITHUB_SECRET` sätts bara för Production, från en egen OAuth-app med callback-URL `https://<domän>/api/auth/callback/github`. Previews saknar därför admininloggning.
- `AUTH_TRUST_HOST` och `AUTH_URL` sätts inte, Vercel sköter det.

Variablerna läses vid bygget. Gör en redeploy efter att du ändrat dem.

### Migrationer vid deploy

Byggkommandot i `vercel.json` kör `npm run db:migrate` före `npm run build`, mot databasen för miljön som byggs. Migrationen går mot `DATABASE_URL_UNPOOLED` eftersom Neons pooler inte klarar alla DDL- och låsoperationer.

- Previews migrerar sin egen Neon-branch. Om Neon-integrationen inte skapar en branch per preview pekar previewns `DATABASE_URL` mot produktionen, och då migreras produktionen redan när en PR pushas.
- Misslyckas migrationen stoppas bygget och den tidigare deployen ligger kvar.
- Migrationerna måste vara bakåtkompatibla, se CLAUDE.md.

### Återställa en deploy

Välj en tidigare deploy i Vercel och använd Instant Rollback (eller Promote to Production). Det byter bara kod. Schemat i databasen ligger kvar, och därför måste den äldre koden fungera mot det nya schemat.

## Begränsningar

- **Alla med ett GitHub-konto kan bli admin.** Det finns ingen lista över tillåtna konton, se [Vem som kan logga in som admin](#vem-som-kan-logga-in-som-admin).
- **Ingen hastighetsbegränsning.** Varken admininloggning eller anslutning med kod är skyddade mot upprepade försök. Provningskoden är 10 slumpade tecken (ca 50 bitar) och går inte att gissa fram i praktiken, men massförsök stoppas inte.
- **Viner kan bara läggas till, ändras och tas bort medan provningen förbereds.** När provningen är igång går det inte att rätta ett vin, så kontrollera uppgifterna före start.
- **Statusen går bara framåt.** En startad provning kan inte återgå till förberedelse och en avslöjad provning kan inte öppnas igen. Det går inte heller att gå med i en avslöjad provning.
- **Deltagare har inget konto.** Sessionen gäller i 7 dagar och bara för en provning. Rensar deltagaren cookies eller byter enhet kommer hen inte åt sina betyg igen.
- **Uppdateringar sker med polling var 4:e sekund.** Att ett vin öppnas eller stängs syns därför med några sekunders fördröjning, och en deltagare kan hinna skicka ett betyg precis när vinet stängs.
- **Betygsskalan är fast.** Poäng 1–10, anteckning högst 500 tecken, gissning högst 100 tecken och högst 5 smaktaggar. Taggar och smakklockor går inte att anpassa per provning.
- **Previews saknar admininloggning**, eftersom GitHub-appen bara är kopplad till Production (se [Miljövariabler på Vercel](#miljövariabler-på-vercel)).
