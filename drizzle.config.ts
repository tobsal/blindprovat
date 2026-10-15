import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Next.js läser .env.local själv, men drizzle-kit gör det inte.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/repositories/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
