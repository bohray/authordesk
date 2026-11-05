import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is intentionally OFF: every page in this app is
  // per-user and session-dependent, and data is fetched client-side via
  // TanStack Query, so request-time rendering is the simpler, correct model.
  cacheComponents: false,
  // Mongoose ships native optional deps that should not be bundled.
  serverExternalPackages: ["mongoose"],
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
