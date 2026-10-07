import Link from "next/link";
import { fmtInt } from "@/lib/format";
import type { EmployerWhd, WhdTopEmployer, WhdYear } from "@/lib/cheap-labor";

/** Whole dollars in millions with one decimal, e.g. $123.4M. */
export function fmtMillions(n: number): string {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

/** Bars of H-1B back wages per fiscal year of findings. */
export function BackWagesByYear({ years }: { years: WhdYear[] }) {
  const max = Math.max(...years.map((y) => Number(y.back_wages)), 1);
  return (
    <div className="flex items-end gap-px sm:gap-1.5" role="list" aria-label="H-1B back wages by fiscal year">
      {years.map((y) => (
        <div
          key={y.fiscal_year}
          role="listitem"
          className="flex min-w-0 flex-1 flex-col items-center gap-1"
          title={`FY${y.fiscal_year}: ${fmtMillions(Number(y.back_wages))}, ${fmtInt(y.cases)} cases`}
        >
          <div
            className="w-full rounded-t bg-amber-400/80"
            style={{ height: `${Math.max(2, (Number(y.back_wages) / max) * 120)}px` }}
          />
          <span
            className={`font-mono text-[10px] text-zinc-500 ${y.fiscal_year % 5 === 0 ? "" : "invisible sm:visible"}`}
          >
            {String(y.fiscal_year).slice(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Employers with the most H-1B back wages; links when the WHD name matches an employer. */
export function BackWagesTable({ rows }: { rows: WhdTopEmployer[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" data-hide="2 3">
        <thead>
          <tr>
            <th>Employer (as named by WHD)</th>
            <th>State</th>
            <th className="text-right">Cases</th>
            <th className="text-right">Back wages</th>
            <th className="text-right">Workers owed</th>
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
              <td className="text-zinc-400">{r.state ?? "—"}</td>
              <td className="text-right font-mono">{fmtInt(r.cases)}</td>
              <td className="text-right font-mono">${fmtInt(Number(r.back_wages))}</td>
              <td className="text-right font-mono">{fmtInt(r.employees)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One line on an employer page for its linked WHD H-1B cases. */
export function EmployerBackWagesNote({ whd }: { whd: EmployerWhd | null }) {
  if (!whd) return null;
  const workers = whd.employees === 1 ? "1 worker" : `${fmtInt(whd.employees)} workers`;
  return (
    <p className="text-xs text-amber-300/90">
      DOL H-1B enforcement: {fmtInt(whd.cases)} {whd.cases === 1 ? "case" : "cases"}. The employer
      agreed to pay ${fmtInt(Number(whd.back_wages))} in H-1B back wages to {workers}
      {whd.latest_fiscal_year ? ` (latest findings FY${whd.latest_fiscal_year})` : ""}.{" "}
      <Link href="/cheap-labor" className="text-emerald-400 hover:underline">
        Source
      </Link>
    </p>
  );
}
