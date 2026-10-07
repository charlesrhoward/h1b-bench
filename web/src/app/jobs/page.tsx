import type { Metadata } from "next";
import Link from "next/link";
import { getJobStats } from "@/lib/queries";
import { FiscalYearTag } from "@/components/title-tags";
import YearTabs, { FISCAL_YEARS } from "@/components/year-tabs";
import { fmtInt, fmtPct } from "@/lib/format";
import { pageMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Occupation benchmarks — H1B Bench",
  description:
    "H-1B Labor Condition Applications by SOC occupation and fiscal year: filings, certification rate, median wage, and employer count. Source: DOL OFLC.",
  path: "/jobs",
});

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; q?: string }>;
}) {
  const { year, q } = await searchParams;
  const fy = year ? Number(year) : 2026;
  const term = q?.trim() ?? "";
  const rows = await getJobStats(fy, 50, term || undefined);

  return (
    <div className="space-y-8">
      <Header fy={fy} term={term} count={rows.length} />

      <YearTabs active={fy} hrefFor={(y) => `/jobs?year=${y}${term ? `&q=${encodeURIComponent(term)}` : ""}`}>
        {term && (
          <Link
            href="/jobs"
            className="rounded-full border border-neutral-tertiary px-3.5 py-1.5 text-sm text-neutral-secondary hover:border-neutral-tertiary-hover hover:text-neutral-secondary-hover"
          >
            Clear “{term}” ×
          </Link>
        )}
      </YearTabs>

      <div className="overflow-x-auto">
        <table className="w-full" data-hide="1 4 6">
          <thead>
            <tr>
              <th>SOC</th>
              <th>Occupation</th>
              <th className="text-right">Filings</th>
              <th className="text-right">Certified</th>
              <th className="text-right">Median wage</th>
              <th className="text-right">Employers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.soc_code}>
                <td className="font-code text-neutral-secondary">{r.soc_code}</td>
                <td className="font-medium">{r.soc_title ?? "—"}</td>
                <td className="text-right tabular-nums">{fmtInt(r.filings)}</td>
                <td className="text-right tabular-nums text-accent-primary">{fmtPct(r.certified, r.filings)}</td>
                <td className="text-right tabular-nums">
                  {r.median_wage_annual ? `$${fmtInt(r.median_wage_annual)}` : "—"}
                </td>
                <td className="text-right tabular-nums">{fmtInt(r.distinct_employers)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className="type-meta">
          No occupations matched{term ? ` “${term}”` : ""} in FY{fy}.
        </p>
      )}
    </div>
  );
}

function Header({ fy, term, count }: { fy: number; term: string; count: number }) {
  return (
    <div>
      <h1 className="type-title">Occupation benchmarks</h1>
      <p className="mt-2 text-neutral-secondary">
        {term
          ? `${count} ${count === 1 ? "occupation" : "occupations"} matching “${term}” · `
          : "LCA filings by SOC occupation code · "}
        <FiscalYearTag fy={fy} ytd={fy === FISCAL_YEARS[0]} />
      </p>
    </div>
  );
}
