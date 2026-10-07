import Link from "next/link";
import { fmtInt } from "@/lib/format";
import { CHEAP_LABOR_FY, type EmployerWarn, type WarnCompany } from "@/lib/cheap-labor";

/** Matched companies with the most workers in WARN notices, next to their H-1B filings. */
export function WarnCompanyTable({ rows }: { rows: WarnCompany[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" data-hide="2 3">
        <thead>
          <tr>
            <th>Company (as named in the notice)</th>
            <th>State</th>
            <th className="text-right">Notices</th>
            <th className="text-right">Workers in notices</th>
            <th className="text-right">H-1B filings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>
                {r.employer_id ? (
                  <Link href={`/employers/${r.employer_id}`} className="hover:text-emerald-400">
                    {r.company}
                  </Link>
                ) : (
                  r.company
                )}
              </td>
              <td className="text-zinc-400">{r.states}</td>
              <td className="text-right font-mono">{fmtInt(r.notices)}</td>
              <td className="text-right font-mono">{fmtInt(r.workers_laid_off)}</td>
              <td className="text-right font-mono">{fmtInt(r.h1b_filings)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One line on an employer page for its company's WARN notices in the fiscal year. */
export function EmployerWarnNote({ warn }: { warn: EmployerWarn | null }) {
  if (!warn) return null;
  const notices = warn.notices === 1 ? "1 notice" : `${fmtInt(warn.notices)} notices`;
  return (
    <p className="text-xs text-amber-300/90">
      WARN layoff notices, FY{CHEAP_LABOR_FY} ({warn.states}): {notices} to lay off{" "}
      {fmtInt(warn.workers_laid_off)} workers, counted across all names of this company.{" "}
      <Link href="/cheap-labor" className="text-emerald-400 hover:underline">
        Source
      </Link>
    </p>
  );
}
