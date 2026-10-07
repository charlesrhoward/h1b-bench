import { fmtInt, fmtPct } from "@/lib/format";
import type { DependencyProfile } from "@/lib/cheap-labor";

const LABELS: Record<DependencyProfile["dependency"], string> = {
  true: "“H-1B dependent” employers",
  false: "Other employers",
  unknown: "Not stated",
};

/** Dependent vs. other employers: wage level mix, pay at the legal minimum, median offer. */
export default function DependencyTable({ rows }: { rows: DependencyProfile[] }) {
  const ordered = [...rows].sort((a, b) => (a.dependency === "true" ? -1 : b.dependency === "true" ? 1 : 0));
  return (
    <div className="overflow-x-auto">
      <table className="w-full" data-hide="2">
        <thead>
          <tr>
            <th>Employer type</th>
            <th className="text-right">Filings</th>
            <th className="text-right">Level I or II</th>
            <th className="text-right">Offered exactly the wage floor</th>
            <th className="text-right">Median offered pay</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((r) => (
            <tr key={r.dependency}>
              <td>{LABELS[r.dependency]}</td>
              <td className="text-right font-mono">{fmtInt(r.filings)}</td>
              <td className="text-right font-mono">
                {fmtPct(r.wage_level_1 + r.wage_level_2, r.wage_level_known)}
              </td>
              <td className="text-right font-mono">{fmtPct(r.paid_at_floor, r.yearly_with_floor)}</td>
              <td className="text-right font-mono">{r.median_wage ? `$${fmtInt(r.median_wage)}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
