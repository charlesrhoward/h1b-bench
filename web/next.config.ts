import type { NextConfig } from "next";
import { FISCAL_YEARS } from "./src/lib/fiscal-years";

const KNOWN_YEAR = `(?<year>${FISCAL_YEARS.join("|")})`;

/**
 * A leaderboard without a search term is the same for every visitor. Serve `/employers` and
 * `/jobs` (no `q`, no `year` or a known `year`) from the cached `/leaderboards/.../[year]` pages.
 * A search or an unknown year still reaches the per-request page.
 */
function leaderboardRewrites(path: "employers" | "jobs") {
  return [
    {
      source: `/${path}`,
      has: [{ type: "query" as const, key: "year", value: KNOWN_YEAR }],
      missing: [{ type: "query" as const, key: "q" }],
      destination: `/leaderboards/${path}/:year`,
    },
    {
      source: `/${path}`,
      missing: [
        { type: "query" as const, key: "year" },
        { type: "query" as const, key: "q" },
      ],
      destination: `/leaderboards/${path}/${FISCAL_YEARS[0]}`,
    },
  ];
}

const nextConfig: NextConfig = {
  // A small shared font stylesheet can trigger a large unused font preload.
  experimental: {
    cssChunking: { type: "graph", requestCost: 1 },
  },
  images: { formats: ["image/avif", "image/webp"] },
  redirects() {
    return [
      // The investigation moved from /cheap-labor (Oct 2026). Keep old links and anchors working.
      { source: "/cheap-labor", destination: "/pay-vs-market", permanent: true },
    ];
  },
  rewrites() {
    // beforeFiles: /employers and /jobs are pages too, so the rewrite must run first.
    return { beforeFiles: [...leaderboardRewrites("employers"), ...leaderboardRewrites("jobs")] };
  },
};

export default nextConfig;
