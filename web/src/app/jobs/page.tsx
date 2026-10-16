import type { Metadata } from "next";
import OccupationBenchmarks from "@/components/occupation-benchmarks";
import { FISCAL_YEARS } from "@/lib/fiscal-years";
import { PAGES } from "@/lib/pages";
import { pageMetadata } from "@/lib/site";

// A year table without a search term is rewritten to /leaderboards/jobs/[year] (next.config.ts),
// which the CDN caches. This page renders per request: a search, or the latest year when `year`
// is not a known fiscal year.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata(PAGES.jobs);

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; q?: string }>;
}) {
  const { year, q } = await searchParams;
  const fy = FISCAL_YEARS.includes(Number(year)) ? Number(year) : FISCAL_YEARS[0];
  return <OccupationBenchmarks fy={fy} term={q?.trim() ?? ""} />;
}
