import type { Metadata } from "next";
import FindingCards from "@/components/labor-pool/finding-cards";
import OccupationTable from "@/components/labor-pool/occupation-table";
import TierBars from "@/components/labor-pool/tier-bars";
import { fmtInt, fmtPct } from "@/lib/format";
import {
  LABOR_POOL_FY,
  getLaborPoolGroupCounts,
  getLaborPoolOccupations,
  getLaborPoolSummary,
  getLcaYearProfile,
  type LaborPoolOccupation,
} from "@/lib/labor-pool";
import { REPO_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Could Americans fill these jobs? — H1B Bench",
  description:
    "A pre-registered test of H-1B filings against unemployed U.S. workers with matching job history, from DOL and Census data.",
};

const LIMITS = [
  "A past job in an occupation does not prove that a person can do a specific job. The data does not measure seniority, specialty, or pay expectations.",
  "An LCA is not a visa. Employers do not fill every new position.",
  "The unemployed count is for one point in time. Over a full year, more people spend time without work. So the test counts fewer people than the full labor pool.",
  "The ACS data is for calendar year 2024. The LCA data is for fiscal year 2025, from October 2024 to September 2025.",
  "The test does not count people outside the labor force. It also does not count employed workers who could change jobs.",
  "The survey counts all U.S. residents. Some of the people in the count are not U.S. citizens.",
];

export default async function LaborPoolPage() {
  const [tiers, occupations, groups, profile] = await Promise.all([
    getLaborPoolSummary(),
    getLaborPoolOccupations(),
    getLaborPoolGroupCounts(),
    getLcaYearProfile(),
  ]);
  const national = tiers.find((t) => t.tier === "national");
  if (!national || !profile) {
    return <p className="text-zinc-400">Labor pool results are not loaded yet.</p>;
  }
  const headline = fmtPct(national.filings_covered, national.filings_total);

  return (
    <div className="max-w-4xl space-y-14">
      <header className="space-y-4">
        <p className="font-mono text-sm text-emerald-400">
          FY{LABOR_POOL_FY} H-1B filings · ACS {national.acs_year} · rules published first
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Could Americans fill these jobs?</h1>
        <p className="text-zinc-400 sm:text-lg">
          Could unemployed Americans fill most H-1B jobs? We wrote the test rules first. Then we ran
          the test on federal data. Three facts point to yes. The main test does not pass.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">What the filings show</h2>
        <FindingCards profile={profile} />
        <p className="text-xs text-zinc-500">
          {fmtInt(profile.certified_filings)} certified H-1B LCA filings, FY{LABOR_POOL_FY}.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold">The labor pool test</h2>
        <div className="rounded-lg border border-zinc-800 p-6">
          <div className="font-mono text-5xl font-bold">{headline}</div>
          <p className="mt-2 text-zinc-300">
            of filings are in occupations where unemployed Americans outnumber new H-1B hires.
          </p>
          <p className="mt-4 text-sm text-zinc-400">
            The test needs more than 50% to show &ldquo;most.&rdquo;{" "}
            <span className="font-semibold text-zinc-100">It does not pass.</span>
          </p>
        </div>
        <TierBars tiers={tiers} />
        <p className="text-sm text-zinc-400">
          For each occupation, we count unemployed Americans who have a bachelor&apos;s degree and
          whose last job was in that occupation. We use the low end of the survey&apos;s 90% margin
          of error. An occupation passes when that count is equal to or more than its new H-1B
          positions.
        </p>
        <p className="text-sm text-zinc-400">
          The count is large enough in {fmtInt(groups.covered)} of {fmtInt(groups.total)}{" "}
          occupations. But those occupations have only {headline} of the filings.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">The 20 occupations with the most filings</h2>
        {occupations[0] ? (
          <DecidingOccupation row={occupations[0]} totalFilings={national.filings_total} />
        ) : null}
        <OccupationTable rows={occupations} totalFilings={national.filings_total} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Limits</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-400">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="text-sm text-zinc-400">
          We published the test rules in a separate commit before we ran the test. Read the{" "}
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

function DecidingOccupation({ row, totalFilings }: { row: LaborPoolOccupation; totalFilings: number }) {
  return (
    <p className="text-sm text-zinc-400">
      {row.occ_title} decide the result. They have {fmtPct(row.filings, totalFilings)} of all
      filings. {fmtInt(row.supply_est)} unemployed Americans had this job, against{" "}
      {fmtInt(row.new_positions)} new H-1B positions.
    </p>
  );
}
