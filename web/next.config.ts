import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects() {
    return [
      // The investigation moved from /cheap-labor (Oct 2026). Keep old links and anchors working.
      { source: "/cheap-labor", destination: "/pay-vs-market", permanent: true },
    ];
  },
};

export default nextConfig;
