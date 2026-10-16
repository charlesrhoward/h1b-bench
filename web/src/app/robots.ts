import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * All crawlers may read every page. The JSON search API is not a page, so it is left out, and
 * /leaderboards/ only serves the /employers and /jobs rewrites.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/leaderboards/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
