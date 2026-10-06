import Link from "next/link";
import { getTopEmployers } from "@/lib/queries";
import { fmtInt, fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

export default async function EmployersPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  const fy = year ? Number(year) : 2025;
  const rows = await getTopEmployers(fy, 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employer leaderboard</h1>
        <p className="mt-1 text-zinc-400">
          H-1B Labor Condition Applications by employer · FY{fy}
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

      <table className="w-full">
        <thead>
          <tr>
            <th>#</th>
            <th>Employer</th>
            <th>State</th>
            <th className="text-right">Filings</th>
            <th className="text-right">Certified</th>
            <th className="text-right">Denied</th>
            <th className="text-right">Workers</th>
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
              <td className="text-right font-mono">
                {r.median_wage_annual ? `$${fmtInt(r.median_wage_annual)}` : "—"}
              </td>
              <td className="max-w-48 truncate text-zinc-400">{r.top_job_title ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
