import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Med cacheComponents renderas sidornas statiska skal direkt och allt som
  // läser sessionen (cookies) eller databasen strömmas in inom Suspense.
  cacheComponents: true,
  // Gör att skalet kan förhämtas även för sidor med dynamiskt innehåll.
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
