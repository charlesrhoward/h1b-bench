import Link from "next/link";
import { getTopEmployers, searchEmployerHits } from "@/lib/queries";
import { fmtInt, fmtPct } from "@/lib/format";
import { WORKFORCE_SHARE_METHOD } from "@/lib/workforce";
import WorkforceShareCell from "@/components/workforce-share-cell";

export const dynamic = "force-dynamic";

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

export default async function EmployersPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; q?: string }>;
}) {
  const { year, q } = await searchParams;
  const term = q?.trim() ?? "";

  if (term) {
    const hits = await searchEmployerHits(term);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Employer search</h1>
          <p className="mt-1 text-zinc-400">
            {hits.length} {hits.length === 1 ? "match" : "matches"} for “{term}” · all-time H-1B filings
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem]">
            <thead>
              <tr>
                <th>#</th>
                <th>Employer</th>
                <th>Location</th>
                <th className="text-right">H-1B filings (all years)</th>
              </tr>
            </thead>
            <tbody>
              {hits.map((h, i) => (
                <tr key={h.id}>
                  <td className="font-mono text-zinc-500">{i + 1}</td>
                  <td>
                    <Link href={`/employers/${h.id}`} className="hover:text-emerald-400">
                      {h.name}
                    </Link>
                  </td>
                  <td className="text-zinc-400">
                    {[h.city, h.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="text-right font-mono">{fmtInt(h.filings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hits.length === 0 && (
          <p className="text-sm text-zinc-500">
            No employers matched. Try a shorter or different spelling — the search is typo-tolerant.
          </p>
        )}
      </div>
    );
  }

  const fy = year ? Number(year) : 2026;
  const rows = await getTopEmployers(fy, 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employer leaderboard</h1>
        <p className="mt-1 text-zinc-400">
          H-1B Labor Condition Applications by employer · FY{fy}
          {fy === YEARS[0] && (
            <span className="ml-2 font-mono text-xs text-zinc-500">year to date</span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {YEARS.map((y) => (
          <Link
            key={y}
            href={`/employers?year=${y}`}
            className={`rounded border px-3 py-1 font-mono text-sm ${
              y === fy
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            FY{y}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[58rem]">
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
                <td className="font-mono text-zinc-500">{i + 1}</td>
                <td>
                  <Link href={`/employers/${r.employer_id}`} className="hover:text-emerald-400">
                    {r.employers?.name}
                  </Link>
                </td>
                <td className="text-zinc-400">{r.employers?.state ?? "—"}</td>
                <td className="text-right font-mono">{fmtInt(r.filings)}</td>
                <td className="text-right font-mono text-emerald-400">{fmtPct(r.certified, r.filings)}</td>
                <td className="text-right font-mono text-zinc-500">{fmtInt(r.denied)}</td>
                <td className="text-right font-mono">{fmtInt(r.worker_positions)}</td>
                <WorkforceShareCell
                  certified={r.certified}
                  headcount={r.employers?.employer_headcounts}
                />
                <td className="text-right font-mono">
                  {r.median_wage_annual ? `$${fmtInt(r.median_wage_annual)}` : "—"}
                </td>
                <td className="max-w-48 truncate text-zinc-400">{r.top_job_title ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="max-w-3xl text-xs text-zinc-500">
        <span className="text-zinc-400">% of workforce</span> — {WORKFORCE_SHARE_METHOD} Grey
        values are less reliable: the headcount appears on only one filing, the employer&apos;s
        filings disagree on it, or the employer filed more LCAs than the employees it reported.
        Hover a value for its source.
      </p>
    </div>
  );
}
