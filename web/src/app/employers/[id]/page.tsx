import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEmployer,
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
import WorkforceShareCell from "@/components/workforce-share-cell";

export const dynamic = "force-dynamic";

export default async function EmployerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employerId = Number(id);
  if (!Number.isFinite(employerId)) notFound();

  const [employer, stats, topJobs, headcount] = await Promise.all([
    getEmployer(employerId),
    getEmployerStats(employerId),
    getEmployerTopJobs(employerId),
    getEmployerHeadcount(employerId),
  ]);
  if (!employer) notFound();

  const h1b = stats.filter((s) => s.visa_class === "H-1B");
  const totalFilings = h1b.reduce((s, r) => s + r.filings, 0);
  const totalCertified = h1b.reduce((s, r) => s + r.certified, 0);
  const totalDenied = h1b.reduce((s, r) => s + r.denied, 0);
  const latestYear = h1b.length ? h1b[h1b.length - 1] : null;

  return (
    <div className="space-y-10">
      <div>
        <Link href="/employers" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Leaderboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{employer.name}</h1>
        <p className="mt-1 text-zinc-400">
          {[employer.city, employer.state, employer.country].filter(Boolean).join(", ")}
        </p>
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(`${employer.name} official website`)}&btnI=1`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-emerald-500/60 hover:text-emerald-400"
          title={`Open ${employer.name}'s website (via Google)`}
        >
          Website
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7" />
            <path d="M8 7h9v9" />
          </svg>
        </a>
      </div>

      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="H-1B filings (all years)" value={fmtInt(totalFilings)} />
          <Stat label="Certification rate" value={fmtPct(totalCertified, totalFilings)} />
          <Stat label="Denied" value={fmtInt(totalDenied)} />
          <Stat
            label="Median wage (latest FY)"
            value={latestYear?.median_wage_annual ? `$${fmtInt(latestYear.median_wage_annual)}` : "—"}
          />
          <WorkforceStat latestYear={latestYear} headcount={headcount} />
        </div>
        <p className="text-xs text-zinc-500" title={WORKFORCE_SHARE_METHOD}>
          {headcountNote(headcount)}
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">By fiscal year · H-1B</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[50rem]">
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
                  <td className="font-mono">FY{r.fiscal_year}</td>
                  <td className="text-right font-mono">{fmtInt(r.filings)}</td>
                  <td className="text-right font-mono text-emerald-400">{fmtPct(r.certified, r.filings)}</td>
                  <td className="text-right font-mono">{fmtInt(r.denied)}</td>
                  <td className="text-right font-mono">{fmtInt(r.withdrawn + r.certified_withdrawn)}</td>
                  <td className="text-right font-mono">{fmtInt(r.worker_positions)}</td>
                  <WorkforceShareCell certified={r.certified} headcount={headcount} />
                  <td className="text-right font-mono">
                    {r.median_wage_annual ? `$${fmtInt(r.median_wage_annual)}` : "—"}
                  </td>
                  <td className="text-zinc-400">{r.top_worksite_state ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Top certified roles</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Based on the most recent 1,000 certified filings
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem]">
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
                  <td>{j.title}</td>
                  <td className="font-mono text-zinc-400">{j.soc ?? "—"}</td>
                  <td className="text-right font-mono">{fmtInt(j.count)}</td>
                  <td className="text-right font-mono">
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
  if (!latestYear) return <Stat label="% of workforce" value="—" muted />;
  const share = workforceShare(latestYear.certified, headcount);
  return (
    <Stat
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

function Stat({
  label,
  value,
  muted = false,
  title,
}: {
  label: string;
  value: string;
  muted?: boolean;
  title?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 p-4" title={title}>
      <div className={`font-mono text-2xl font-bold ${muted ? "text-zinc-500" : ""}`}>{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{label}</div>
    </div>
  );
}
