import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Tester mot en riktig, migrerad databas (DATABASE_URL). Körs med npm run test:db.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    // Filerna delar databas, så de körs en i taget.
    fileParallelism: false,
  },
});
