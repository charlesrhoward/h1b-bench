import { fmtInt, fmtPct } from "@/lib/format";
import type { DependencyProfile } from "@/lib/cheap-labor";

const LABELS: Record<DependencyProfile["dependency"], string> = {
  true: "“H-1B dependent” employers",
  false: "Other employers",
  unknown: "Not stated",
};

const dependentFirst = (row: DependencyProfile) => (row.dependency === "true" ? 0 : 1);

/** Dependent vs. other employers: wage level mix, pay at the legal minimum, median offer. */
export default function DependencyTable({ rows }: { rows: DependencyProfile[] }) {
  const ordered = [...rows].sort((a, b) => dependentFirst(a) - dependentFirst(b));
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
              <td className="text-right tabular-nums">{fmtInt(r.filings)}</td>
              <td className="text-right tabular-nums">
                {fmtPct(r.wage_level_1 + r.wage_level_2, r.wage_level_known)}
              </td>
              <td className="text-right tabular-nums">{fmtPct(r.paid_at_floor, r.yearly_with_floor)}</td>
              <td className="text-right tabular-nums">{r.median_wage ? `$${fmtInt(r.median_wage)}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
