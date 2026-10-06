import type { Metadata } from "next";
import Link from "next/link";
import DependencyTable from "@/components/cheap-labor/dependency-table";
import EvidenceSection from "@/components/cheap-labor/evidence-section";
import WageLevelBar from "@/components/cheap-labor/wage-level-bar";
import {
  CHEAP_LABOR_FY,
  WAGE_LEVEL_SOURCE_URL,
  getDependencyProfile,
  totalWageLevels,
  type DependencyProfile,
} from "@/lib/cheap-labor";
import { fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Is H-1B used as cheap labor? — H1B Bench",
  description:
    "Federal data on H-1B pay: wage levels, employers that depend on H-1B workers, and pay at the legal minimum.",
};

const DOL_SOURCE = `DOL OFLC LCA disclosure data, certified H-1B filings, FY${CHEAP_LABOR_FY}.`;

export default async function CheapLaborPage() {
  const profile = await getDependencyProfile();
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
