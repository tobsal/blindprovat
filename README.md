# Blindprovat

Webbapp för att arrangera blindprovningar av vin i grupp. Vad appen gör, teknikval, kommandon och regler för koden står i [CLAUDE.md](CLAUDE.md).

## Kom igång

1. Installera beroenden med `npm install`.
2. Kopiera `.env.example` till `.env.local` och fyll i värdena. Kommentarerna i `.env.example` beskriver varje variabel.
3. Kör migrationerna med `npm run db:migrate`.
4. Starta appen med `npm run dev`.

## Anslutningssträng till databasen i PowerShell

De flesta kommandon läser `DATABASE_URL` från `.env.local` själva:

| Kommando | Läser `.env.local` |
|---|---|
| `npm run dev`, `npm run build` | Ja |
| `npm run db:generate`, `npm run db:migrate` | Ja |
| `npm run test:e2e` | Ja |
| `npm run test:db` | **Nej** |

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
