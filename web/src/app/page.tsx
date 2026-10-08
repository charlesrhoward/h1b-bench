import Link from "next/link";
import Image from "next/image";
import { getBirthCountryShares, getOverviewStats, getTopEmployers } from "@/lib/queries";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { WORKFORCE_SHARE_METHOD } from "@/lib/workforce";
import { Eyebrow, FiscalYearTag } from "@/components/title-tags";
import StatCard from "@/components/stat-card";
import JsonLd from "@/components/json-ld";
import { lcaDatasetJsonLd } from "@/lib/json-ld";
import WorkforceShareCell from "@/components/workforce-share-cell";
import BirthCountrySection from "@/components/birth-country-section";
import { EmployerFlagPills } from "@/components/employer-flags";
import { getEmployerFlags } from "@/lib/employer-flags";

export const dynamic = "force-dynamic";

const JSON_LD = lcaDatasetJsonLd();

export default async function Home() {
  const birthCountriesPromise = getBirthCountryShares();
  const { years, totalFilings, totalCertified, employerCount } = await getOverviewStats();
  const latestYear = years.at(-1)?.[0] ?? 2025;
  const [top, birthCountries] = await Promise.all([getTopEmployers(latestYear, 10), birthCountriesPromise]);
  const flags = await getEmployerFlags(top.map((r) => r.employer_id));
  const maxFilings = Math.max(...years.map(([, v]) => v.filings), 1);

  return (
    <div className="space-y-16 sm:space-y-20">
      <JsonLd data={JSON_LD} />
      <section className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_16rem] md:gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-6">
          <Eyebrow parts={["DOL OFLC disclosure data", "FY2020–FY2026 Q3"]} />
          <h1 className="type-hero max-w-3xl text-balance">
            Who sponsors <span className="whitespace-nowrap">H-1B</span> workers, what they pay, and how
            often they&apos;re certified.
          </h1>
          <p className="type-body max-w-2xl text-neutral-secondary">
            Every Labor Condition Application filed with the Department of Labor — benchmarked by
            employer, occupation, wage, and year.
          </p>
          <div className="flex flex-wrap gap-3 pt-1 text-sm">
            <Link
              href="/employers"
              className="rounded-full bg-brand-primary px-5 py-2.5 font-medium text-neutral-tertiary hover:bg-brand-primary-hover"
            >
              Browse employers
            </Link>
            <Link
              href="/pay-vs-market"
              className="rounded-full border border-neutral-secondary px-5 py-2.5 font-medium text-neutral-primary hover:border-brand-primary"
            >
              Read the pay evidence
            </Link>
            <Link
              href="/explore"
              className="rounded-full border border-neutral-secondary px-5 py-2.5 font-medium text-neutral-primary hover:border-brand-primary"
            >
              Explore the data
            </Link>
          </div>
        </div>
        <Image
          src="/capitol-engraving.webp"
          alt=""
          width={870}
          height={980}
          priority
          sizes="(min-width: 1280px) 26rem, (min-width: 1024px) 22rem, (min-width: 768px) 16rem, 18rem"
          className="ink-art mx-auto h-auto w-full max-w-72 md:max-w-none"
        />
      </section>

      <section aria-label="Totals" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
        <StatCard label="LCA filings" value={fmtInt(totalFilings)} />
        <StatCard label="Certified" value={fmtPct(totalCertified, totalFilings)} />
        <StatCard label="Employers" value={fmtInt(employerCount)} />
        <StatCard label="Fiscal years" value={String(years.length)} />
      </section>

      <section>
        <h2 className="type-heading mb-6">Filings by fiscal year</h2>
        <div className="flex items-end gap-1.5 border-b border-neutral-tertiary sm:gap-3">
          {years.map(([year, v]) => (
            <div key={year} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-xs tabular-nums text-neutral-secondary">
                <span className="sm:hidden">{fmtCompact(v.filings)}</span>
                <span className="hidden sm:inline">{fmtInt(v.filings)}</span>
              </span>
              <div
                className="w-full max-w-16 rounded-t-sm bg-chart-accent-primary"
                style={{ height: `${Math.max(4, (v.filings / maxFilings) * 160)}px` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 sm:gap-3">
          {years.map(([year]) => (
            <span key={year} className="min-w-0 flex-1 text-center text-xs text-neutral-secondary">
              FY{String(year).slice(2)}
            </span>
          ))}
        </div>
      </section>

      <BirthCountrySection years={birthCountries.years} countries={birthCountries.countries} />

      <section>
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="type-heading">
            Top H-1B sponsors · <FiscalYearTag fy={latestYear} ytd />
          </h2>
          <Link href={`/employers?year=${latestYear}`} className="link text-sm">
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
                  <td className="tabular-nums text-neutral-secondary">{i + 1}</td>
                  <td>
                    <Link href={`/employers/${r.employer_id}`} className="font-medium hover:text-accent-primary">
                      {r.employers?.name}
                    </Link>{" "}
                    <EmployerFlagPills flags={flags.get(r.employer_id)} />
                  </td>
                  <td className="text-right tabular-nums">{fmtInt(r.filings)}</td>
                  <td className="text-right tabular-nums text-accent-primary">{fmtPct(r.certified, r.filings)}</td>
                  <WorkforceShareCell
                    certified={r.certified}
                    headcount={r.employers?.employer_headcounts}
                  />
                  <td className="text-right tabular-nums">
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
