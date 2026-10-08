import Link from "@/components/intent-link";
import { fmtInt } from "@/lib/format";
import type { EmployerLayoffFilings, LayoffFilingsCompany } from "@/lib/cheap-labor";
import { getEmployerLinker } from "@/lib/employer-tickers";

/** "2020-10-01" -> "Oct 2020". */
export function fmtMonth(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** Companies with the most workers in WARN notices that new-worker H-1B filings followed. */
export async function LayoffFilingsTable({ rows }: { rows: LayoffFilingsCompany[] }) {
  const employerHref = await getEmployerLinker();
  return (
    <div className="overflow-x-auto">
      <table className="w-full" data-hide="2 4 6 7 8 9 10" data-hide-md="2 7 8">
        <thead>
          <tr>
            <th>Company (name in the notice)</th>
            <th>States</th>
            <th className="text-right">Workers in layoff notices</th>
            <th className="text-right">First notice</th>
            <th className="text-right">New-worker H-1B filings, 12 months after</th>
            <th className="text-right">Of those, within 90 days</th>
            <th className="text-right">Same filings, 12 months before any notice</th>
            <th className="text-right">Of the filings after: new employment</th>
            <th className="text-right">Of the filings after: from another employer</th>
            <th className="text-right">Extensions and amendments after (not counted)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>
                {r.employer_id ? (
                  <Link href={employerHref({ id: r.employer_id, name: r.company })} className="hover:text-accent-primary">
                    {r.company}
                  </Link>
                ) : (
                  r.company
                )}
              </td>
              <td className="text-neutral-secondary">{r.states.replaceAll(",", ", ")}</td>
              <td className="text-right tabular-nums">{fmtInt(r.workers_laid_off)}</td>
              <td className="text-right tabular-nums">{fmtMonth(r.first_notice)}</td>
              <td className="text-right tabular-nums">{fmtInt(r.filings_after)}</td>
              <td className="text-right tabular-nums">{fmtInt(r.filings_after_90)}</td>
              <td className="text-right tabular-nums">{fmtInt(r.filings_before)}</td>
              <td className="text-right tabular-nums">{fmtInt(r.filings_after_new_employment)}</td>
              <td className="text-right tabular-nums">{fmtInt(r.filings_after_change_employer)}</td>
              <td className="text-right tabular-nums text-neutral-secondary">{fmtInt(r.filings_after_not_counted)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One line on an employer page: its company's layoff notices, then new-worker H-1B filings. */
export function EmployerLayoffFilingsNote({ row }: { row: EmployerLayoffFilings | null }) {
  if (!row) return null;
  const notices = row.notices_followed === 1 ? "1 notice" : `${fmtInt(row.notices_followed)} notices`;
  return (
    <p className="type-meta">
      WARN layoff notices ({row.states.replaceAll(",", ", ")}): {notices} for {fmtInt(row.workers_laid_off)} workers. In
      the 12 months after them, this company filed {fmtInt(row.filings_after)} certified H-1B filings for workers
      new to the company: {fmtInt(row.filings_after_new_employment)} for new employment and{" "}
      {fmtInt(row.filings_after_change_employer)} for workers who moved from another employer. It also filed{" "}
      {fmtInt(row.filings_after_not_counted)} extensions and amendments for current workers, which are not counted. In the 12 months before any of its layoff notices, it filed {fmtInt(row.filings_before)}. Counted across all names of this
      company.{" "}
      <Link href="/pay-vs-market#finding-6" className="link">
        Source
      </Link>
    </p>
  );
}
