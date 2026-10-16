import type { Metadata } from "next";
import EmployerLeaderboard from "@/components/employer-leaderboard";
import { fiscalYearParams } from "@/lib/fiscal-years";
import { PAGES } from "@/lib/pages";
import { pageMetadata } from "@/lib/site";

// Target of the `/employers` and `/employers?year=` rewrites in next.config.ts. The address bar
// keeps the public URL, and the canonical URL stays /employers.
export const revalidate = 3600;
export const dynamicParams = false;
export const generateStaticParams = fiscalYearParams;

export const metadata: Metadata = pageMetadata(PAGES.employers);

export default async function EmployerLeaderboardPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  return <EmployerLeaderboard fy={Number(year)} />;
}
