import type { Metadata } from "next";
import { displayFont } from "@/lib/display-font";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getEmployerHeadcount,
  getEmployerStats,
  getEmployerTopJobs,
  type EmployerYearStat,
} from "@/lib/queries";
import { fmtInt, fmtPct } from "@/lib/format";
import {
  WORKFORCE_SHARE_METHOD,
  describeHeadcount,
  workforceShare,
  type Headcount,
} from "@/lib/workforce";
import StatCard from "@/components/stat-card";
import WorkforceShareCell from "@/components/workforce-share-cell";
import EmployerMarketGapNote from "@/components/cheap-labor/employer-market-gap-note";
import { EmployerBackWagesNote } from "@/components/cheap-labor/back-wages";
import { EmployerPermNote } from "@/components/cheap-labor/perm-tables";
import { EmployerLayoffFilingsNote } from "@/components/cheap-labor/layoff-filings-tables";
import {
  getEmployerLayoffFilings,
  getEmployerLayoffTimeline,
  getEmployerMarketGap,
  getEmployerPerm,
  getEmployerWhd,
} from "@/lib/cheap-labor";
import LayoffTimeline from "@/components/cheap-labor/layoff-timeline";
import { pageMetadata } from "@/lib/site";
import { employerJsonLd } from "@/lib/json-ld";
import JsonLd from "@/components/json-ld";
import { ParentNote } from "@/components/employer-parent";
import EmployerHero from "@/components/employer-hero";
import { employerFlags } from "@/lib/employer-flags";
import { loadEmployer } from "@/lib/employer-page";
import { EMPLOYER_OG_ALT, EMPLOYER_OG_SIZE } from "@/lib/employer-og";

export const revalidate = 3600;

// Build employer pages on first visit, then reuse them until revalidation.
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const found = await loadEmployer(slug);
  if (!found) return { title: "Employer not found — H1B Bench" };
  const { employer, segment } = found;
  const place = [employer.city, employer.state].filter(Boolean).join(", ");
  return pageMetadata({
    title: `${employer.name} — H-1B filings and pay — H1B Bench`,
    description: `H-1B Labor Condition Applications filed by ${employer.name}${place ? ` (${place})` : ""}: filings by year, certification rate, median wage, and top roles. Source: DOL OFLC.`,
    path: `/employers/${segment}`,
    image: { url: `/employers/${segment}/opengraph-image`, ...EMPLOYER_OG_SIZE, alt: EMPLOYER_OG_ALT },
  });
}

export default async function EmployerDetail({ params }: Params) {
  const { slug } = await params;
  const found = await loadEmployer(slug);
  if (!found) notFound();
  const { employer, parent, segment } = found;
  if (slug !== segment) permanentRedirect(`/employers/${segment}`);
  const employerId = employer.id;

  const [stats, topJobs, headcount, marketGap, whd, layoffFilings, perm, layoffTimeline] = await Promise.all([
    getEmployerStats(employerId),
    getEmployerTopJobs(employerId),
    getEmployerHeadcount(employerId),
    getEmployerMarketGap(employerId),
    getEmployerWhd(employerId),
    getEmployerLayoffFilings(employerId),
    getEmployerPerm(employerId),
    getEmployerLayoffTimeline(employerId),
  ]);

  const flags = employerFlags(marketGap, layoffFilings);
  const h1b = stats.filter((s) => s.visa_class === "H-1B");
  const totalFilings = h1b.reduce((s, r) => s + r.filings, 0);
  const totalCertified = h1b.reduce((s, r) => s + r.certified, 0);
  const totalDenied = h1b.reduce((s, r) => s + r.denied, 0);
  const latestYear = h1b.length ? h1b[h1b.length - 1] : null;

  return (
    <div className={`${displayFont.variable} space-y-14`}>
      <JsonLd data={employerJsonLd(employer, `/employers/${segment}`)} />
      <EmployerHero found={found} flags={flags} />

      <LayoffTimeline timeline={flags.layoffs ? layoffTimeline : null} employer={employer.name} />

      <section className="space-y-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="H-1B filings (all years)" value={fmtInt(totalFilings)} />
          <StatCard label="Certification rate" value={fmtPct(totalCertified, totalFilings)} />
          <StatCard label="Denied" value={fmtInt(totalDenied)} />
          <StatCard
            label="Median wage (latest FY)"
            value={latestYear?.median_wage_annual ? `$${fmtInt(latestYear.median_wage_annual)}` : "—"}
          />
          <WorkforceStat latestYear={latestYear} headcount={headcount} />
        </div>
        <div className="space-y-2 border-l-2 border-accent-primary pl-4">
          <p className="type-meta" title={WORKFORCE_SHARE_METHOD}>
            {headcountNote(headcount)}
          </p>
          <EmployerMarketGapNote gap={marketGap} />
          <EmployerBackWagesNote whd={whd} />
          <EmployerLayoffFilingsNote row={layoffFilings} />
          <EmployerPermNote perm={perm} />
          <ParentNote parent={parent} />
        </div>
      </section>

      <section>
        <h2 className="type-heading mb-5">By fiscal year · H-1B</h2>
        <div className="overflow-x-auto">
          <table className="w-full" data-hide="3 4 5 6 9" data-hide-md="5 9">
            <thead>
              <tr>
                <th>FY</th>
                <th className="text-right">Filings</th>
                <th className="text-right">Certified</th>
                <th className="text-right">Denied</th>
                <th className="text-right">Withdrawn</th>
                <th className="text-right">Workers</th>
                <th className="text-right" title={WORKFORCE_SHARE_METHOD}>
                  % of workforce
                </th>
                <th className="text-right">Median wage</th>
                <th>Top worksite state</th>
              </tr>
            </thead>
            <tbody>
              {h1b.map((r) => (
                <tr key={r.fiscal_year}>
                  <td className="tabular-nums">FY{r.fiscal_year}</td>
                  <td className="text-right tabular-nums">{fmtInt(r.filings)}</td>
                  <td className="text-right tabular-nums text-accent-primary">{fmtPct(r.certified, r.filings)}</td>
                  <td className="text-right tabular-nums">{fmtInt(r.denied)}</td>
                  <td className="text-right tabular-nums">{fmtInt(r.withdrawn + r.certified_withdrawn)}</td>
                  <td className="text-right tabular-nums">{fmtInt(r.worker_positions)}</td>
                  <WorkforceShareCell certified={r.certified} headcount={headcount} />
                  <td className="text-right tabular-nums">
                    {r.median_wage_annual ? `$${fmtInt(r.median_wage_annual)}` : "—"}
                  </td>
                  <td className="text-neutral-secondary">{r.top_worksite_state ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="type-heading mb-1">Top certified roles</h2>
        <p className="type-meta mb-4">
          Based on the most recent 1,000 certified filings
        </p>
        <div className="overflow-x-auto">
          <table className="w-full" data-hide="2">
            <thead>
              <tr>
                <th>Job title</th>
                <th>SOC</th>
                <th className="text-right">Certified filings</th>
                <th className="text-right">Median wage</th>
              </tr>
            </thead>
            <tbody>
              {topJobs.map((j) => (
                <tr key={j.title}>
                  <td className="font-medium">{j.title}</td>
                  <td className="font-code text-neutral-secondary">{j.soc ?? "—"}</td>
                  <td className="text-right tabular-nums">{fmtInt(j.count)}</td>
                  <td className="text-right tabular-nums">
                    {j.medianWage ? `$${fmtInt(j.medianWage)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function WorkforceStat({
  latestYear,
  headcount,
}: {
  latestYear: EmployerYearStat | null;
  headcount: Headcount | null;
}) {
  if (!latestYear) return <StatCard label="% of workforce" value="—" muted />;
  const share = workforceShare(latestYear.certified, headcount);
  return (
    <StatCard
      label={`% of workforce (FY${latestYear.fiscal_year})`}
      value={share.label}
      muted={!share.reliable}
      title={share.title}
    />
  );
}

function headcountNote(headcount: Headcount | null): string {
  if (!headcount) return "Workforce: no PERM headcount on file, so % of workforce is unavailable.";
  const matchedByName = headcount.match_method === "name" ? " (matched by name)" : "";
  return `Workforce: ${describeHeadcount(headcount)}${matchedByName}.`;
}
