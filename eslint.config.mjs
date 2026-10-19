import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Lagergränser (se CLAUDE.md, "Struktur och lager"). Beroenden går bara nedåt:
// app -> api -> repositories -> domain, och validation -> domain.
const layerDirs = ["app", "api", "repositories", "validation"];

// Förbjuder import från lagren i `layers`, både via aliaset @/ och relativt.
function forbidLayers(layers, message) {
  return [
    {
      group: layers.flatMap((layer) => [`@/${layer}`, `@/${layer}/**`]),
      message,
    },
    {
      regex: `^\\.\\./(.*/)?(${layers.join("|")})(/|$)`,
      message,
    },
  ];
}

function forbidPackages(names, message) {
  return {
    group: names.flatMap((name) => [name, `${name}/*`]),
    message,
  };
}

const reactPackages = ["next", "react", "react-dom"];
const databasePackages = ["drizzle-orm", "drizzle-kit"];

function restrictImports(files, patterns) {
  return { files, rules: { "no-restricted-imports": ["error", { patterns }] } };
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Hindrar fantomberoenden: paket som används måste stå i package.json.
    rules: {
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/*.test.{ts,tsx}",
            "e2e/**",
            "*.config.{ts,mts,mjs}",
            "scripts/**",
          ],
        },
      ],
    },
  },
  // Testhjälp (src/test-support) får bara användas av tester. Reglerna för
  // lagergränserna nedan använder no-restricted-imports, så den här regeln
  // är en egen för att inte skriva över dem.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/test-support/**"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: [
                "./src/*/**/!(*.test).{ts,tsx}",
                "./src/!(*.test).{ts,tsx}",
              ],
              from: "./src/test-support",
              message:
                "Testhjälp i src/test-support får bara importeras från tester (*.test.ts).",
            },
          ],
        },
      ],
    },
  },
  // Domän: ren affärslogik som inte beror på något annat lager eller ramverk.
  restrictImports(
    ["src/domain/**/*.{ts,tsx}"],
    [
      ...forbidLayers(
        layerDirs,
        "Domänlagret får inte importera från lager ovanför sig. Flytta logiken eller skicka in värdet som argument.",
      ),
      forbidPackages(
        [
          ...reactPackages,
          ...databasePackages,
          "zod",
          "next-auth",
          "@auth/core",
        ],
        "Domänlagret ska vara rent: inga ramverk, databas, validering eller auth.",
      ),
    ],
  ),
  // Validering: delas mellan formulär och server, beror bara på domänen.
  restrictImports(
    ["src/validation/**/*.{ts,tsx}"],
    [
      ...forbidLayers(
        ["app", "api", "repositories"],
        "Valideringslagret får bara bero på domänen.",
      ),
      forbidPackages(
        [...reactPackages, ...databasePackages],
        "Valideringslagret ska inte bero på ramverk eller databas.",
      ),
    ],
  ),
  // Dataåtkomst: enda stället som pratar med databasen.
  restrictImports(
    ["src/repositories/**/*.{ts,tsx}"],
    [
      ...forbidLayers(
        ["app", "api", "validation"],
        "Dataåtkomstlagret får bara bero på domänen.",
      ),
      forbidPackages(
        ["react", "react-dom"],
        "Dataåtkomstlagret ska inte bero på UI-bibliotek.",
      ),
    ],
  ),
  // Serveranrop: når databasen bara via dataåtkomstlagret.
  restrictImports(
    ["src/api/**/*.{ts,tsx}"],
    [
      ...forbidLayers(
        ["app"],
        "Serveranrop får inte importera från presentationslagret.",
      ),
      forbidPackages(
        databasePackages,
        "Databasen nås bara via dataåtkomstlagret (src/repositories).",
      ),
    ],
  ),
  // Presentation: når varken databasen eller dataåtkomstlagret direkt.
  restrictImports(
    ["src/app/**/*.{ts,tsx}"],
    [
      ...forbidLayers(
        ["repositories"],
        "Presentationslagret ska anropa src/api, inte dataåtkomstlagret.",
      ),
      // Sessionen läses via src/api/admin-session, inte direkt från Auth.js.
      {
        group: ["@/auth"],
        message:
          "Presentationslagret ska läsa sessionen via src/api/admin-session och inte importera @/auth.",
      },
      {
        regex: "^\\.\\./(.*/)?auth$",
        message:
          "Presentationslagret ska läsa sessionen via src/api/admin-session och inte importera auth.",
      },
      forbidPackages(
        databasePackages,
        "Databasen nås bara via dataåtkomstlagret (src/repositories).",
      ),
    ],
  ),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
