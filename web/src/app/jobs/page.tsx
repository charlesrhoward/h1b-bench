import Link from "next/link";
import { getJobStats } from "@/lib/queries";
import { fmtInt, fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  const fy = year ? Number(year) : 2025;
  const rows = await getJobStats(fy);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Occupation benchmarks</h1>
        <p className="mt-1 text-zinc-400">
          LCA filings by SOC occupation code · FY{fy}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {YEARS.map((y) => (
          <Link
            key={y}
            href={`/jobs?year=${y}`}
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
              <td className="font-mono text-zinc-400">{r.soc_code}</td>
              <td>{r.soc_title ?? "—"}</td>
              <td className="text-right font-mono">{fmtInt(r.filings)}</td>
              <td className="text-right font-mono text-emerald-400">{fmtPct(r.certified, r.filings)}</td>
              <td className="text-right font-mono">
                {r.median_wage_annual ? `$${fmtInt(r.median_wage_annual)}` : "—"}
              </td>
              <td className="text-right font-mono">{fmtInt(r.distinct_employers)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
