import type { Metadata } from "next";
import Link from "next/link";
import { Newsreader } from "next/font/google";
import ComparisonChart from "@/components/cheap-labor/comparison-chart";
import DependencyTable from "@/components/cheap-labor/dependency-table";
import EvidenceDetails from "@/components/cheap-labor/evidence-details";
import EvidenceSection from "@/components/cheap-labor/evidence-section";
import InvestigationIntro from "@/components/cheap-labor/investigation-intro";
import InvestigationNav from "@/components/cheap-labor/investigation-nav";
import { BelowMedianLeaders, MarketGapTable, fmtGap } from "@/components/cheap-labor/market-gap-tables";
import { PwPublisherTable, PwSourceTable } from "@/components/cheap-labor/pw-source-tables";
import BackWagesSection from "@/components/cheap-labor/sections/back-wages-section";
import LotterySection from "@/components/cheap-labor/sections/lottery-section";
import PermSection from "@/components/cheap-labor/sections/perm-section";
import WarnSection from "@/components/cheap-labor/sections/warn-section";
import WageLevelBar from "@/components/cheap-labor/wage-level-bar";
import {
  BENEFICIARY_CENTRIC_FROM,
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
import "./investigation.css";

const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-investigation", style: ["normal", "italic"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Is H-1B used as cheap labor? — H1B Bench",
  description:
    "Federal data on H-1B pay and use: wage levels, pay below the local median, back wages, layoffs, lottery registrations, and green card filings.",
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
    <article className={`investigation ${newsreader.variable}`}>
      <InvestigationIntro summary={marketGap.find((row) => row.dependency === "all")} />
      <div className="investigation-reading-layout">
        <InvestigationNav chapters={[
          { index: 1, label: "The pay gap", available: marketGap.some((row) => row.dependency === "all") },
          { index: 2, label: "The wage floor", available: profile.length > 0 },
          { index: 3, label: "The employer divide", available: profile.length > 0 },
          { index: 4, label: "Private salary surveys", available: pwSources.some((row) => row.source === "survey") && pwSources.some((row) => row.source === "oews") },
          { index: 5, label: "Proven wage violations", available: whdYears.length > 0 },
          { index: 6, label: "Layoffs & H-1B filings", available: !!warnSummary },
          { index: 7, label: "The lottery changed", available: lottery.some((row) => row.cap_fiscal_year < BENEFICIARY_CENTRIC_FROM) && lottery.some((row) => row.cap_fiscal_year >= BENEFICIARY_CENTRIC_FROM) },
          { index: 8, label: "The green card link", available: !!permSummary },
        ]} />
        <div className="investigation-story">
          <MarketGapSection rows={marketGap} leaders={leaders} />
          <WageLevelSection profile={profile} />
          <DependencySection profile={profile} />
          <PwSourceSection rows={pwSources} publishers={publishers} />
          <div className="story-divider">
            <p className="story-kicker">Beyond the salary</p>
            <h2>Different records. Different questions.</h2>
            <p>
              Pay comparisons show a gap. Enforcement records show documented violations.
              Layoffs, lottery entries, and green card filings add context, with limits of their own.
            </p>
          </div>
          <BackWagesSection index={5} years={whdYears} top={whdTop} />
          <WarnSection index={6} summary={warnSummary} companies={warnCompanies} />
          <LotterySection index={7} years={lottery} />
          <PermSection index={8} summary={permSummary} employers={permEmployers} />
          <section className="reading-guide" id="reading-the-evidence" aria-labelledby="reading-guide-title">
            <p className="story-kicker">A note on the evidence</p>
            <h2 id="reading-guide-title">Keep three distinctions in mind.</h2>
            <dl>
              <div><dt>An offer is not a paycheck.</dt><dd>Filings report an offered wage. They do not show actual earnings or prove that a worker received a visa.</dd></div>
              <div><dt>A benchmark is not a legal minimum.</dt><dd>The local median includes all experience levels. A below-median offer alone does not establish a violation.</dd></div>
              <div><dt>Overlap is not replacement.</dt><dd>A company can report layoffs and H-1B filings for different jobs. These records cannot show who replaced whom.</dd></div>
            </dl>
            <p>Each finding above includes its source, scope, and limits. The linked methods explain how we calculated the results.</p>
          </section>
          <aside className="story-next">
            <p className="story-kicker">Read next</p>
            <Link href="/labor-pool">Who is available to do this work? <span aria-hidden="true">↗</span></Link>
            <p>Compare H-1B demand with the U.S. labor pool.</p>
            <Link className="story-next-secondary" href="/employers">Look up an employer <span aria-hidden="true">→</span></Link>
          </aside>
        </div>
      </div>
    </article>
  );
}

function WageLevelSection({ profile }: { profile: DependencyProfile[] }) {
  const { levels, known } = totalWageLevels(profile);
  const belowMedian = levels[0].count + levels[1].count;
  return (
    <EvidenceSection
      index={2}
      title="The wage floor can sit below the local median."
      takeaway="An offer can meet the listed wage floor and still fall below the midpoint of local pay."
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
        DOL&apos;s four wage levels reflect different job requirements. The first two sit below
        the local median. Level III is at the median. Level IV is above it.
      </p>
      <WageLevelBar levels={levels} known={known} />
      <p>
        In FY{CHEAP_LABOR_FY},{" "}
        <span className="font-semibold text-zinc-100">{fmtPct(belowMedian, known)}</span> of filings
        with a known wage level were at Level I or II. That is the wage floor, not necessarily the offered pay.
      </p>
    </EvidenceSection>
  );
}

function DependencySection({ profile }: { profile: DependencyProfile[] }) {
  const dependent = profile.find((r) => r.dependency === "true");
  const other = profile.find((r) => r.dependency === "false");
  return (
    <EvidenceSection
      index={3}
      title="Employers differ in how often they offer the minimum."
      takeaway="Employers that report H-1B dependence more often offer exactly the listed wage floor."
      limits="The “H-1B dependent” label comes from the employer's own filing. These groups can differ in their jobs, locations, and experience requirements. The comparison does not isolate the effect of H-1B dependence."
      source={DOL_SOURCE}
    >
      <p>
        DOL calls an employer &ldquo;H-1B dependent&rdquo; when H-1B workers are a large part of its
        staff. For an employer with 51 or more full-time workers, the limit is 15%.
      </p>
      {dependent && other ? (
        <ComparisonChart title="Share of filings that offer exactly the wage floor" rows={[
          { label: "H-1B dependent employers", count: dependent.paid_at_floor, total: dependent.yearly_with_floor },
          { label: "Other employers", count: other.paid_at_floor, total: other.yearly_with_floor },
        ]} note={`Yearly wages with a reported floor · FY${CHEAP_LABOR_FY}`} />
      ) : null}
      <EvidenceDetails title="View the data by employer type"><DependencyTable rows={profile} /></EvidenceDetails>
    </EvidenceSection>
  );
}

function MarketGapSection({ rows, leaders }: { rows: MarketGapSummary[]; leaders: EmployerMarketGap[] }) {
  const all = rows.find((r) => r.dependency === "all");
  if (!all) return null;
  return (
    <EvidenceSection
      index={1}
      title="The gap is about local pay, not a small salary."
      takeaway="Compare an offer with what the same occupation pays in the same area. A national salary average can miss that difference."
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
      <p>The median is the midpoint: half of local workers in that occupation earn more, and half earn less.</p>
      <p>
        <span className="font-semibold text-zinc-100">{fmtPct(all.below_median, all.filings_matched)}</span>{" "}
        of matched filings offer less than the local median. When a filing is below the median, the
        median gap is {fmtGap(all.median_gap_below)} a year.
      </p>
      <ComparisonChart title="Share of matched offers below the local median" rows={rows
        .filter((row) => row.dependency === "true" || row.dependency === "false")
        .sort((a, b) => a.dependency.localeCompare(b.dependency)).reverse()
        .map((row) => ({ label: row.dependency === "true" ? "H-1B dependent employers" : "Other employers", count: row.below_median, total: row.filings_matched }))}
        note={`Same occupation and area · All experience levels · FY${CHEAP_LABOR_FY}`} />
      <p>
        An &ldquo;H-1B dependent&rdquo; employer reports a large share of H-1B workers on its staff.
        <a href="#finding-3" className="inline-method-link"> See the definition and wage-floor comparison.</a>
      </p>
      <EvidenceDetails title="View the pay comparison data">
        <p>The shortfall cited above uses only offers below the local median. The table&apos;s median gap includes all matched offers in each group.</p>
        <MarketGapTable rows={rows} />
      </EvidenceDetails>
      {leaders.length > 0 ? (
        <EvidenceDetails title={`Explore ${leaders.length} large sponsors with the highest shares below the median`}>
          <p>
            These large sponsors offer less than the local median most often. Each has{" "}
            {fmtInt(MIN_RANKED_FILINGS)} or more matched filings.
          </p>
          <BelowMedianLeaders rows={leaders} />
        </EvidenceDetails>
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
      title="The source of the wage floor matters, too."
      takeaway="Offers tied to private salary surveys fall below the local median more often than offers tied to government wage data."
      limits="The source is the employer's own entry on the filing. A private survey can be lawful and accurate. This comparison does not show that the survey caused lower pay. It uses only filings with a local-median match, as described in finding 01."
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
      <ComparisonChart title="Share of matched offers below the local median" rows={[
        { label: "Private salary surveys", count: survey.below_median, total: survey.gap_matched },
        { label: "Government wage data", count: oews.below_median, total: oews.gap_matched },
      ]} note={`Grouped by the wage source on the filing · FY${CHEAP_LABOR_FY}`} />
      <EvidenceDetails title="View all wage sources"><PwSourceTable rows={rows} /></EvidenceDetails>
      {publishers.length > 0 ? (
        <EvidenceDetails title="View the most-used survey publishers">
          <p>The survey publishers on the most filings:</p>
          <PwPublisherTable rows={publishers} />
        </EvidenceDetails>
      ) : null}
    </EvidenceSection>
  );
}
