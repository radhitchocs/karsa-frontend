import type { NextConfig } from "next";

// Allow LAN access in dev (e.g. phone on same WiFi).
// Set NEXT_ALLOWED_DEV_ORIGINS=192.168.1.50 (hostname only, no port; comma-separated for multiple).
const allowedDevOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS
  ? process.env.NEXT_ALLOWED_DEV_ORIGINS.split(',').map((s) => s.trim())
  : [];

const nextConfig: NextConfig = {
  // NEXT_DIST_DIR lets each e2e suite build into its own output directory so
  // running test:e2e, test:e2e:demo, and test:e2e:bots in any order never
  // requires a manual rebuild between suites.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
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
