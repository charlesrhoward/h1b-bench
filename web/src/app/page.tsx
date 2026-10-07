import Link from "next/link";
import Image from "next/image";
import { getOverviewStats, getTopEmployers } from "@/lib/queries";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { WORKFORCE_SHARE_METHOD } from "@/lib/workforce";
import { Eyebrow, FiscalYearTag } from "@/components/title-tags";
import WorkforceShareCell from "@/components/workforce-share-cell";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { years, totalFilings, totalCertified, employerCount } = await getOverviewStats();
  const latestYear = years.at(-1)?.[0] ?? 2025;
  const top = await getTopEmployers(latestYear, 10);
  const maxFilings = Math.max(...years.map(([, v]) => v.filings), 1);

  return (
    <div className="space-y-12">
      <section className="relative space-y-5 pb-4 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(to_right,#34d399_1px,transparent_1px),linear-gradient(to_bottom,#34d399_1px,transparent_1px)] [background-size:140px_140px] [mask-image:radial-gradient(ellipse_80%_80%_at_60%_30%,black,transparent_80%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 right-0 -z-10 hidden w-[22rem] max-w-none sm:-top-20 sm:block sm:w-[28rem] lg:-right-6 lg:w-[38rem]"
        >
          <Image
            src="/capitol-wide.webp"
            alt=""
            width={635}
            height={550}
            priority
            className="h-auto w-full mask-t-from-85% mask-r-from-70% mask-b-from-60% mask-l-from-65%"
          />
        </div>
        <div
          aria-hidden
          className="absolute right-2 top-24 hidden space-y-2.5 font-mono text-xs tracking-[0.2em] text-zinc-500 lg:block"
        >
          <p>DATA</p>
          <p>PEOPLE</p>
          <p>OPPORTUNITY</p>
          <div className="pt-2">
            <div className="h-0.5 w-7 bg-emerald-400" />
          </div>
        </div>
        <Eyebrow parts={["DOL OFLC disclosure data", "FY2020–FY2026 Q3"]} />
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
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
        <div className="flex items-end gap-1.5 sm:gap-3">
          {years.map(([year, v]) => (
            <div key={year} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="font-mono text-xs text-zinc-400">
                <span className="sm:hidden">{fmtCompact(v.filings)}</span>
                <span className="hidden sm:inline">{fmtInt(v.filings)}</span>
              </span>
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
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg font-semibold">
            Top H-1B sponsors · <FiscalYearTag fy={latestYear} ytd />
          </h2>
          <Link href={`/employers?year=${latestYear}`} className="text-sm text-emerald-400 hover:underline">
            Full leaderboard →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" data-hide="4 6">
            <thead>
              <tr>
                <th>#</th>
                <th>Employer</th>
                <th className="text-right">Filings</th>
                <th className="text-right">Certified</th>
                <th className="text-right" title={WORKFORCE_SHARE_METHOD}>
                  % of workforce
                </th>
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
                  <WorkforceShareCell
                    certified={r.certified}
                    headcount={r.employers?.employer_headcounts}
                  />
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
