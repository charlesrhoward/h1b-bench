import Link from "next/link";
import Image from "next/image";
import { getOverviewStats, getTopEmployers } from "@/lib/queries";
import { fmtInt, fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { years, totalFilings, totalCertified, employerCount } = await getOverviewStats();
  const latestYear = years.at(-1)?.[0] ?? 2025;
  const top = await getTopEmployers(latestYear, 10);
  const maxFilings = Math.max(...years.map(([, v]) => v.filings), 1);

  return (
    <div className="space-y-12">
      <section className="relative space-y-5 py-8 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_60%_at_78%_30%,rgba(16,185,129,0.14),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-4 top-1/2 hidden w-64 -translate-y-1/2 sm:block md:w-80 lg:right-0 lg:w-96"
        >
          <Image
            src="/capitol.webp"
            alt=""
            width={385}
            height={385}
            priority
            className="opacity-90 [mask-image:radial-gradient(closest-side,black_35%,transparent_98%)]"
          />
        </div>
        <p className="font-mono text-sm text-emerald-400">DOL OFLC disclosure data · FY2020–FY2026 Q3</p>
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
          Who sponsors H-1B workers, what they pay, and how often they&apos;re certified.
        </h1>
        <p className="max-w-2xl text-zinc-400 sm:text-lg">
          Every Labor Condition Application filed with the Department of Labor — benchmarked by
          employer, occupation, wage, and year.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="LCA filings" value={fmtInt(totalFilings)} />
        <Stat label="Certified" value={fmtPct(totalCertified, totalFilings)} />
        <Stat label="Employers" value={fmtInt(employerCount)} />
        <Stat label="Fiscal years" value={String(years.length)} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Filings by fiscal year</h2>
        <div className="flex items-end gap-3">
          {years.map(([year, v]) => (
            <div key={year} className="flex flex-1 flex-col items-center gap-2">
              <span className="font-mono text-xs text-zinc-400">{fmtInt(v.filings)}</span>
              <div
                className="w-full rounded-t bg-emerald-500/80"
                style={{ height: `${Math.max(4, (v.filings / maxFilings) * 160)}px` }}
              />
              <span className="font-mono text-xs text-zinc-500">FY{String(year).slice(2)}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Top H-1B sponsors · FY{latestYear}
            <span className="ml-2 align-middle font-mono text-xs font-normal text-zinc-500">
              year to date
            </span>
          </h2>
          <Link href={`/employers?year=${latestYear}`} className="text-sm text-emerald-400 hover:underline">
            Full leaderboard →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem]">
            <thead>
              <tr>
                <th>#</th>
                <th>Employer</th>
                <th className="text-right">Filings</th>
                <th className="text-right">Certified</th>
                <th className="text-right">Median wage</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r, i) => (
                <tr key={r.employer_id}>
                  <td className="font-mono text-zinc-500">{i + 1}</td>
                  <td>
                    <Link href={`/employers/${r.employer_id}`} className="hover:text-emerald-400">
                      {r.employers?.name}
                    </Link>
                  </td>
                  <td className="text-right font-mono">{fmtInt(r.filings)}</td>
                  <td className="text-right font-mono text-emerald-400">{fmtPct(r.certified, r.filings)}</td>
                  <td className="text-right font-mono">
                    {r.median_wage_annual ? `$${fmtInt(r.median_wage_annual)}` : "—"}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 p-4">
      <div className="font-mono text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{label}</div>
    </div>
  );
}
