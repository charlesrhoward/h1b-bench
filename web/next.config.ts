import type { NextConfig } from "next";

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
};

export default nextConfig;
