import type { Metadata } from "next";
import FindingCards from "@/components/labor-pool/finding-cards";
import MeasureCard from "@/components/labor-pool/measure-card";
import OccupationTable from "@/components/labor-pool/occupation-table";
import TierBars from "@/components/labor-pool/tier-bars";
import { Eyebrow } from "@/components/title-tags";
import { fmtInt, fmtPct } from "@/lib/format";
import {
  LABOR_POOL_FY,
  fillablePositions,
  getLaborPoolFillable,
  getLaborPoolGroupCounts,
  getLaborPoolOccupations,
  getLaborPoolSummary,
  getLcaYearProfile,
  type LaborPoolFillable,
  type LaborPoolOccupation,
  type LaborPoolSummary,
} from "@/lib/labor-pool";
import { REPO_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Could Americans fill these jobs? — H1B Bench",
  description:
    "H-1B filings against unemployed U.S. workers with matching job history, from DOL and Census data. It counts the unemployed only, not the underemployed.",
};

const LIMITS = [
  "The test counts only the unemployed. It does not count the underemployed or people who gave up the search for work.",
  "A past job in an occupation does not prove that a person can do a specific job. The data does not measure seniority, specialty, or pay expectations.",
  "An LCA is not a visa. Employers do not fill every new position.",
  "The unemployed count is for one point in time. Over a full year, more people spend time without work. So the test counts fewer people than the full labor pool.",
  "The ACS data is for calendar year 2024. The LCA data is for fiscal year 2025, from October 2024 to September 2025.",
  "The test does not count employed workers who could change jobs.",
  "The survey counts all U.S. residents. Some of the people in the count are not U.S. citizens.",
];

export default async function LaborPoolPage() {
  const [tiers, fillable, occupations, groups, profile] = await Promise.all([
    getLaborPoolSummary(),
    getLaborPoolFillable(),
    getLaborPoolOccupations(),
    getLaborPoolGroupCounts(),
    getLcaYearProfile(),
  ]);
  const national = tiers.find((t) => t.tier === "national");
  const largest = occupations[0];
  if (!national || !profile || !largest || fillable.length === 0) {
    return <p className="text-zinc-400">Labor pool results are not loaded yet.</p>;
  }

  return (
    <div className="max-w-5xl space-y-14">
      <header className="max-w-4xl space-y-4">
        <Eyebrow parts={[`FY${LABOR_POOL_FY} H-1B filings`, `ACS ${national.acs_year}`, "unemployed only"]} />
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">Could Americans fill these jobs?</h1>
        <p className="text-zinc-400 sm:text-lg">
          Could unemployed Americans fill most H-1B jobs? We compare new H-1B positions with
          unemployed Americans who had the same job, from federal data.
        </p>
        <ScopeNotice />
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">What the filings show</h2>
        <FindingCards profile={profile} />
        <p className="text-xs text-zinc-500">
          {fmtInt(profile.certified_filings)} certified H-1B LCA filings, FY{LABOR_POOL_FY}.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold">The unemployed only: two ways to count</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <PositionMeasure fillable={fillable} largest={largest} />
          <OccupationMeasure tiers={tiers} largest={largest} groups={groups} />
        </div>
        <p className="text-sm font-semibold text-zinc-200">
          Neither measure counts the underemployed. The real pool of American workers is larger
          than either number.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">The 20 occupations with the most filings</h2>
        <OccupationTable rows={occupations} totalFilings={national.filings_total} />
      </section>

      <section className="max-w-4xl space-y-4">
        <h2 className="text-lg font-semibold">Limits</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-400">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="text-sm text-zinc-400">
          We published the Measure 1 rules in a separate commit before we ran the test. Read the{" "}
          <a href={`${REPO_URL}/blob/main/docs/labor-pool-method.md`} className="text-emerald-400 hover:underline">
            method
          </a>{" "}
          and the{" "}
          <a href={`${REPO_URL}/blob/main/docs/labor-pool-results.md`} className="text-emerald-400 hover:underline">
            full results
          </a>{" "}
          on GitHub.
        </p>
        <p className="text-xs text-zinc-500">
          Sources: DOL OFLC LCA disclosure data, FY{LABOR_POOL_FY}. U.S. Census Bureau American
          Community Survey {national.acs_year} 1-year microdata (PUMS).
        </p>
      </section>
    </div>
  );
}

function ScopeNotice() {
  return (
    <div className="rounded-lg border border-amber-400/40 bg-amber-400/5 p-5">
      <p className="font-semibold text-amber-300">This page counts only the unemployed.</p>
      <p className="mt-2 text-sm text-zinc-300">
        It does not count the underemployed. Underemployed means two groups. Some are degree holders
        in jobs below their skills. Others work part time but want full-time work. The page also
        does not count people who gave up the search for work, or employed workers who could change
        jobs. The real pool of American workers is larger than any count on this page.
      </p>
    </div>
  );
}

function PositionMeasure({
  fillable,
  largest,
}: {
  fillable: LaborPoolFillable[];
  largest: LaborPoolOccupation;
}) {
  const national = fillable.find((f) => f.tier === "national") ?? fillable[0];
  const largestFill = fillablePositions(largest);
  return (
    <MeasureCard
      label="Measure 2 · by position"
      value={fmtPct(national.positions_fillable, national.positions_total)}
      statement="of new H-1B positions could go to unemployed Americans who had the same job."
    >
      <TierBars
        bars={fillable.map((f) => ({ tier: f.tier, part: f.positions_fillable, whole: f.positions_total }))}
      />
      <p className="text-sm text-zinc-400">
        Example: {largest.occ_title?.toLowerCase()}. There were {fmtInt(largest.new_positions)} new
        H-1B positions. At least {fmtInt(largestFill)} unemployed Americans had this job. So the
        unemployed alone could fill {fmtPct(largestFill, largest.new_positions)} of these positions.
      </p>
      <p className="text-xs text-zinc-500">
        In each occupation, we count the smaller of two numbers: new H-1B positions, or unemployed
        Americans who had that job. We use the low end of the 90% margin of error. We added this
        measure after we saw Measure 1. It was not in the published rules.
      </p>
    </MeasureCard>
  );
}

function OccupationMeasure({
  tiers,
  largest,
  groups,
}: {
  tiers: LaborPoolSummary[];
  largest: LaborPoolOccupation;
  groups: { total: number; covered: number };
}) {
  const national = tiers.find((t) => t.tier === "national") ?? tiers[0];
  return (
    <MeasureCard
      label="Measure 1 · by occupation · published rules"
      value={fmtPct(national.filings_covered, national.filings_total)}
      statement="of filings are in occupations where unemployed Americans can fill all new H-1B positions."
    >
      <TierBars
        bars={tiers.map((t) => ({ tier: t.tier, part: t.filings_covered, whole: t.filings_total }))}
      />
      <p className="text-sm text-zinc-400">
        An occupation counts only if the unemployed can fill all of its new H-1B positions. So{" "}
        {largest.occ_title?.toLowerCase()} count as zero, although the unemployed could fill{" "}
        {fmtPct(fillablePositions(largest), largest.new_positions)} of them.
      </p>
      <p className="text-xs text-zinc-500">
        The unemployed alone can fill all new H-1B positions in {fmtInt(groups.covered)} of{" "}
        {fmtInt(groups.total)} occupations. We use the low end of the 90% margin of error.
      </p>
    </MeasureCard>
  );
}
