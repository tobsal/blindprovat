# Blindprovat

Webbapp för att arrangera blindprovningar av vin i grupp. Vad appen gör, teknikval, kommandon och regler för koden står i [CLAUDE.md](CLAUDE.md).

## Förutsättningar

- **Node.js 24** (samma version som i CI). npm följer med Node.
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
