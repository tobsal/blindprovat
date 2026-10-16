import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL saknas. Se .env.example.");
  }
  // prepare: false krävs mot Neons pooler (PgBouncer i transaktionsläge).
  return drizzle(postgres(url, { prepare: false }), {
    schema,
    casing: "snake_case",
  });
}

export type Db = ReturnType<typeof createDb>;

// Återanvänder anslutningen när Next.js laddar om moduler i dev.
const globalForDb = globalThis as typeof globalThis & { blindprovatDb?: Db };

export const db = globalForDb.blindprovatDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.blindprovatDb = db;
}
