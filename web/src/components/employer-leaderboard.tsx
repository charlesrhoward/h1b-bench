import Link from "@/components/intent-link";
import { getTopEmployers, type EmployerYearStat } from "@/lib/queries";
import { fmtInt, fmtPct } from "@/lib/format";
import { PAGES } from "@/lib/pages";
import { collectionPageJsonLd } from "@/lib/json-ld";
import JsonLd from "@/components/json-ld";
import { WORKFORCE_SHARE_METHOD } from "@/lib/workforce";
import officeTower from "@/assets/art/office-tower.webp";
import HeaderArt from "@/components/header-art";
import { FiscalYearTag } from "@/components/title-tags";
import WorkforceShareCell from "@/components/workforce-share-cell";
import YearTabs from "@/components/year-tabs";
import { FISCAL_YEARS } from "@/lib/fiscal-years";
import { EmployerFlagPills } from "@/components/employer-flags";
import { getEmployerFlags, type EmployerFlags } from "@/lib/employer-flags";
import type { EmployerRef } from "@/lib/employer-path";
import { getEmployerLinker } from "@/lib/employer-tickers";

const JSON_LD = collectionPageJsonLd(PAGES.employers);

/** Leaderboard employer cell: the linked name, then any warning flags. */
function EmployerNameCell({
  row,
  employerHref,
  flags,
}: {
  row: EmployerYearStat;
  employerHref: (ref: EmployerRef) => string;
  flags: EmployerFlags | undefined;
}) {
  const name = row.employers?.name ?? "";
  return (
    <td>
      <Link href={employerHref({ id: row.employer_id, name })} className="font-medium hover:text-accent-primary">
        {name}
      </Link>{" "}
      <EmployerFlagPills flags={flags} />
    </td>
  );
}

/**
 * The top 100 employers for one fiscal year. It is the same for every visitor, so
 * `/leaderboards/employers/[year]` serves it from the cache (see the rewrites in next.config.ts).
 */
export default async function EmployerLeaderboard({ fy }: { fy: number }) {
  const employerHrefPromise = getEmployerLinker();
  const rows = await getTopEmployers(fy, 100);
  const [flags, employerHref] = await Promise.all([
    getEmployerFlags(rows.map((r) => r.employer_id)),
    employerHrefPromise,
  ]);

  return (
    <div className="space-y-8">
      <JsonLd data={JSON_LD} />
      <div className="relative flex flex-col justify-end gap-8 sm:min-h-48 lg:min-h-60">
        <HeaderArt src={officeTower} className="right-0 bottom-0 w-44 lg:w-56" />
        <div>
          <h1 className="type-title">Employer leaderboard</h1>
          <p className="mt-2 text-neutral-secondary">
            H-1B Labor Condition Applications by employer ·{" "}
            <FiscalYearTag fy={fy} ytd={fy === FISCAL_YEARS[0]} />
          </p>
        </div>
        <YearTabs active={fy} hrefFor={(y) => `/employers?year=${y}`} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" data-hide="3 5 6 7 9 10" data-hide-md="6 10">
          <thead>
            <tr>
              <th>#</th>
              <th>Employer</th>
              <th>State</th>
              <th className="text-right">Filings</th>
              <th className="text-right">Certified</th>
              <th className="text-right">Denied</th>
              <th className="text-right">Workers</th>
              <th className="text-right" title={WORKFORCE_SHARE_METHOD}>
                % of workforce
              </th>
              <th className="text-right">Median wage</th>
              <th>Top role</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.employer_id}-${r.fiscal_year}`}>
                <td className="tabular-nums text-neutral-secondary">{i + 1}</td>
                <EmployerNameCell row={r} employerHref={employerHref} flags={flags.get(r.employer_id)} />
                <td className="text-neutral-secondary">{r.employers?.state ?? "—"}</td>
                <td className="text-right tabular-nums">{fmtInt(r.filings)}</td>
                <td className="text-right tabular-nums text-accent-primary">{fmtPct(r.certified, r.filings)}</td>
                <td className="text-right tabular-nums text-neutral-secondary">{fmtInt(r.denied)}</td>
                <td className="text-right tabular-nums">{fmtInt(r.worker_positions)}</td>
                <WorkforceShareCell
                  certified={r.certified}
                  headcount={r.employers?.employer_headcounts}
                />
                <td className="text-right tabular-nums">
                  {r.median_wage_annual ? `$${fmtInt(r.median_wage_annual)}` : "—"}
                </td>
                <td className="max-w-48 truncate text-neutral-secondary">{r.top_job_title ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="type-meta max-w-3xl">
        <span className="font-medium text-neutral-primary">% of workforce</span> — {WORKFORCE_SHARE_METHOD} Grey
        values are less reliable: the headcount appears on only one filing, the employer&apos;s
        filings disagree on it, or the employer filed more LCAs than the employees it reported.
        Hover a value for its source.
      </p>
    </div>
  );
}
