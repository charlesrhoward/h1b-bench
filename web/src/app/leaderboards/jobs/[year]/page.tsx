import type { Metadata } from "next";
import OccupationBenchmarks from "@/components/occupation-benchmarks";
import { fiscalYearParams } from "@/lib/fiscal-years";
import { PAGES } from "@/lib/pages";
import { pageMetadata } from "@/lib/site";

// Target of the `/jobs` and `/jobs?year=` rewrites in next.config.ts. The address bar keeps the
// public URL, and the canonical URL stays /jobs.
export const revalidate = 3600;
export const dynamicParams = false;
export const generateStaticParams = fiscalYearParams;

export const metadata: Metadata = pageMetadata(PAGES.jobs);

export default async function OccupationBenchmarksPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  return <OccupationBenchmarks fy={Number(year)} term="" />;
}
