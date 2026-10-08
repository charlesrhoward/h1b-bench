import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/** All crawlers may read every page. The JSON search API is not a page, so it is left out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
