import type { MetadataRoute } from "next";
import { PAGE_LIST } from "@/lib/pages";
import { getSitemapEmployerIds } from "@/lib/queries";
import { absoluteUrl } from "@/lib/site";

// Data loads quarterly, so a daily rebuild keeps the list current.
export const revalidate = 86400;

/** Last complete fiscal year; employers with at least 10 filings in it get a sitemap entry. */
const SITEMAP_FISCAL_YEAR = 2025;
const SITEMAP_MIN_FILINGS = 10;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const employerIds = await getSitemapEmployerIds(SITEMAP_FISCAL_YEAR, SITEMAP_MIN_FILINGS);
  const pages = PAGE_LIST.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
  const employers = employerIds.map((id) => ({
    url: absoluteUrl(`/employers/${id}`),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));
  return [...pages, ...employers];
}
