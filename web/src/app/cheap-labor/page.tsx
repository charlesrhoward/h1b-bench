import type { Metadata } from "next";
import Link from "next/link";
import DependencyTable from "@/components/cheap-labor/dependency-table";
import EvidenceSection from "@/components/cheap-labor/evidence-section";
import { BelowMedianLeaders, MarketGapTable, fmtGap } from "@/components/cheap-labor/market-gap-tables";
import { PwPublisherTable, PwSourceTable } from "@/components/cheap-labor/pw-source-tables";
import BackWagesSection from "@/components/cheap-labor/sections/back-wages-section";
import LotterySection from "@/components/cheap-labor/sections/lottery-section";
import PermSection from "@/components/cheap-labor/sections/perm-section";
import WarnSection from "@/components/cheap-labor/sections/warn-section";
import WageLevelBar from "@/components/cheap-labor/wage-level-bar";
import {
  CHEAP_LABOR_FY,
  MIN_RANKED_FILINGS,
  WAGE_LEVEL_SOURCE_URL,
  getBelowMedianLeaders,
  getDependencyProfile,
  getMarketGapSummary,
  getPermLayoffEmployers,
  getPermLockinSummary,
  getPwSourceSummary,
  getPwSurveyPublishers,
  getUscisRegistrations,
  getWarnCompanies,
  getWarnSummary,
  getWhdTopEmployers,
  getWhdYears,
  totalWageLevels,
  type DependencyProfile,
  type EmployerMarketGap,
  type MarketGapSummary,
  type PwSourceSummary,
  type PwSurveyPublisher,
} from "@/lib/cheap-labor";
import { fmtInt, fmtPct } from "@/lib/format";
import { REPO_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Is H-1B used as cheap labor? — H1B Bench",
  description:
    "Federal data on H-1B pay: wage levels, employers that depend on H-1B workers, and pay at the legal minimum.",
};

const DOL_SOURCE = `DOL OFLC LCA disclosure data, certified H-1B filings, FY${CHEAP_LABOR_FY}.`;

export default async function CheapLaborPage() {
  const [profile, marketGap, leaders, pwSources, publishers, whdYears, whdTop, warnSummary, warnCompanies, lottery, permSummary, permEmployers] =
    await Promise.all([
    getDependencyProfile(),
    getMarketGapSummary(),
    getBelowMedianLeaders(),
    getPwSourceSummary(),
    getPwSurveyPublishers(),
    getWhdYears(),
    getWhdTopEmployers(),
    getWarnSummary(),
    getWarnCompanies(),
    getUscisRegistrations(),
    getPermLockinSummary(),
    getPermLayoffEmployers(),
  ]);
  if (profile.length === 0) {
    return <p className="text-zinc-400">Results for FY{CHEAP_LABOR_FY} are not loaded yet.</p>;
  }

  return (
    <div className="max-w-4xl space-y-12">
      <header className="space-y-4">
        <p className="font-mono text-sm text-emerald-400">FY{CHEAP_LABOR_FY} · federal data only</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Is H-1B used as cheap labor?</h1>
        <p className="text-zinc-400 sm:text-lg">
          This page tests the claim with federal data. Each section states one result, its source,
          and its limits. For unemployed Americans who could fill these jobs, see the{" "}
          <Link href="/labor-pool" className="text-emerald-400 hover:underline">
            labor pool
          </Link>
          .
        </p>
      </header>

      <WageLevelSection profile={profile} />
      <DependencySection profile={profile} />
      <MarketGapSection rows={marketGap} leaders={leaders} />
      <PwSourceSection rows={pwSources} publishers={publishers} />
      <BackWagesSection index={5} years={whdYears} top={whdTop} />
      <WarnSection index={6} summary={warnSummary} companies={warnCompanies} />
      <LotterySection index={7} years={lottery} />
      <PermSection index={8} summary={permSummary} employers={permEmployers} />
    </div>
  );
}

function WageLevelSection({ profile }: { profile: DependencyProfile[] }) {
  const { levels, known } = totalWageLevels(profile);
  const belowMedian = levels[0].count + levels[1].count;
  return (
    <EvidenceSection
      index={1}
      title="Most H-1B jobs have a legal minimum below the local median wage."
      limits="The level sets the minimum only. An employer can pay more than the minimum."
      source={
        <>
          {DOL_SOURCE} Level percentiles:{" "}
          <a href={WAGE_LEVEL_SOURCE_URL} className="text-emerald-400 hover:underline">
            DOL proposed rule, Federal Register, March 27, 2026
          </a>
          .
        </>
      }
    >
      <p>
        DOL sets the legal minimum pay for an H-1B job at one of four wage levels. Each level is a
        fixed point in the local pay range for the occupation. Level I is the 17th percentile. Level
        II is the 34th percentile. Level III is the 50th percentile, which is the local median. Level
        IV is the 67th percentile.
      </p>
      <WageLevelBar levels={levels} known={known} />
      <p>
        In FY{CHEAP_LABOR_FY},{" "}
        <span className="font-semibold text-zinc-100">{fmtPct(belowMedian, known)}</span> of filings
        were at Level I or II. For these jobs, the legal minimum is below the local median for the
        same work.
      </p>
    </EvidenceSection>
  );
}

function DependencySection({ profile }: { profile: DependencyProfile[] }) {
  const dependent = profile.find((r) => r.dependency === "true");
  const other = profile.find((r) => r.dependency === "false");
  return (
    <EvidenceSection
      index={2}
      title="Employers that depend on H-1B workers pay less."
      limits="The “H-1B dependent” label comes from the employer's own filing."
      source={DOL_SOURCE}
    >
      <p>
        DOL calls an employer &ldquo;H-1B dependent&rdquo; when H-1B workers are a large part of its
        staff. For an employer with 51 or more full-time workers, the limit is 15%.
      </p>
      <DependencyTable rows={profile} />
      {dependent && other ? (
        <p>
          &ldquo;H-1B dependent&rdquo; employers paid exactly the legal minimum on{" "}
          <span className="font-semibold text-zinc-100">
            {fmtPct(dependent.paid_at_floor, dependent.yearly_with_floor)}
          </span>{" "}
          of filings. Other employers did this on {fmtPct(other.paid_at_floor, other.yearly_with_floor)}{" "}
          of filings.
        </p>
      ) : null}
    </EvidenceSection>
  );
}

function MarketGapSection({ rows, leaders }: { rows: MarketGapSummary[]; leaders: EmployerMarketGap[] }) {
  const all = rows.find((r) => r.dependency === "all");
  if (!all) return null;
  return (
    <EvidenceSection
      index={3}
      title="Most H-1B filings offer less than the local median pay."
      limits={`Offered pay is the bottom of the offered range. The local median covers all workers in the occupation and area, at all experience levels. ${fmtInt(all.filings_matched)} of ${fmtInt(all.filings_eligible)} yearly, full-time filings matched an area and a wage. DOL left the worksite county blank on most filings in its FY${CHEAP_LABOR_FY} Q4 file, so most of those filings are not in the count.`}
      source={
        <>
          {DOL_SOURCE} DOL OFLC Online Wage Library, Level III wage, wage years 2024-25 and 2025-26.{" "}
          <a href={`${REPO_URL}/blob/main/docs/market-gap-method.md`} className="text-emerald-400 hover:underline">
            Method
          </a>
          , committed before the results.
        </>
      }
    >
      <p>
        We compare the pay on each filing with the local median pay for the same occupation in the
        same area. The local median comes from DOL&apos;s own wage library.
      </p>
      <p>
        <span className="font-semibold text-zinc-100">{fmtPct(all.below_median, all.filings_matched)}</span>{" "}
        of matched filings offer less than the local median. When a filing is below the median, the
        median gap is {fmtGap(all.median_gap_below)} a year.
      </p>
      <MarketGapTable rows={rows} />
      {leaders.length > 0 ? (
        <>
          <p>
            These large sponsors offer less than the local median most often. Each has{" "}
            {fmtInt(MIN_RANKED_FILINGS)} or more matched filings.
          </p>
          <BelowMedianLeaders rows={leaders} />
        </>
      ) : null}
    </EvidenceSection>
  );
}

function PwSourceSection({ rows, publishers }: { rows: PwSourceSummary[]; publishers: PwSurveyPublisher[] }) {
  const survey = rows.find((r) => r.source === "survey");
  const oews = rows.find((r) => r.source === "oews");
  if (!survey || !oews) return null;
  return (
    <EvidenceSection
      index={4}
      title="Filings with an employer-chosen survey offer less."
      limits="The source is the employer's own entry on the filing. A private survey can be lawful and accurate. This result compares outcomes; it does not judge any single survey. The local-median comparison uses only filings that matched in section 03."
      source={
        <>
          {DOL_SOURCE}{" "}
          <a href={`${REPO_URL}/blob/main/docs/pw-source-method.md`} className="text-emerald-400 hover:underline">
            Method
          </a>
          , committed before the results.
        </>
      }
    >
      <p>
        Each filing states where its wage floor came from. Most filings use government data. Some
        employers choose a private salary survey instead.
      </p>
      <p>
        Filings with a private survey offer less than the local median{" "}
        <span className="font-semibold text-zinc-100">{fmtPct(survey.below_median, survey.gap_matched)}</span> of
        the time. Filings with government data do this {fmtPct(oews.below_median, oews.gap_matched)} of the
        time.
      </p>
      <PwSourceTable rows={rows} />
      {publishers.length > 0 ? (
        <>
          <p>The survey publishers on the most filings:</p>
          <PwPublisherTable rows={publishers} />
        </>
      ) : null}
    </EvidenceSection>
  );
}
