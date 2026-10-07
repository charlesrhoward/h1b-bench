import Link from "next/link";
import { fmtInt, fmtPct } from "@/lib/format";
import { PERM_FY, type EmployerPerm, type PermLayoffEmployer } from "@/lib/cheap-labor";

/** Employers with the most certified green card filings after a reported layoff. */
export function PermLayoffTable({ rows }: { rows: PermLayoffEmployer[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" data-hide="2">
        <thead>
          <tr>
            <th>Employer</th>
            <th className="text-right">Certified filings</th>
            <th className="text-right">After a layoff</th>
            <th className="text-right">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name_key}>
              <td>
                {r.employer_id ? (
                  <Link href={`/employers/${r.employer_id}`} className="hover:text-emerald-400">
                    {r.name}
                  </Link>
                ) : (
                  r.name
                )}
              </td>
              <td className="text-right font-mono">{fmtInt(r.certified)}</td>
              <td className="text-right font-mono">{fmtInt(r.layoff_certified)}</td>
              <td className="text-right font-mono">{fmtPct(r.layoff_certified, r.certified)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One line on an employer page for its certified green card filings in the year. */
export function EmployerPermNote({ perm }: { perm: EmployerPerm | null }) {
  if (!perm || perm.certified === 0) return null;
  return (
    <p className="text-xs text-amber-300/90">
      Green card (PERM) filings certified in FY{PERM_FY}: {fmtInt(perm.certified)}. On{" "}
      {fmtInt(perm.fw_working)}, the worker already worked for this employer.
      {perm.layoff_certified > 0
        ? ` On ${fmtInt(perm.layoff_certified)}, the employer reported a layoff in the area, in the occupation or a related occupation, in the 6 months before.`
        : ""}{" "}
      <Link href="/cheap-labor" className="text-emerald-400 hover:underline">
        Source
      </Link>
    </p>
  );
}
