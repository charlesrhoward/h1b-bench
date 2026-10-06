import { fmtInt, fmtPct } from "@/lib/format";
import type { LaborPoolOccupation } from "@/lib/labor-pool";

/** Top occupation groups by filings, with supply, demand, and the pass/fail result. */
export default function OccupationTable({
  rows,
  totalFilings,
}: {
  rows: LaborPoolOccupation[];
  totalFilings: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem]">
        <thead>
          <tr>
            <th>Occupation</th>
            <th className="text-right">H-1B filings</th>
            <th className="text-right">Share</th>
            <th className="text-right">New H-1B positions</th>
            <th className="text-right" title="Unemployed, bachelor's degree or higher, last job in this occupation. ± is the 90% margin of error.">
              Unemployed, bachelor&apos;s+
            </th>
            <th className="text-right">Passes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.occ_code}>
              <td>{r.occ_title ?? r.occ_code}</td>
              <td className="text-right font-mono">{fmtInt(r.filings)}</td>
              <td className="text-right font-mono text-zinc-500">{fmtPct(r.filings, totalFilings)}</td>
              <td className="text-right font-mono">{fmtInt(r.new_positions)}</td>
              <td className="text-right font-mono">
                {fmtInt(r.supply_est)}
                <span className="ml-1 text-xs text-zinc-500">±{fmtInt(r.supply_moe)}</span>
              </td>
              <td className={`text-right font-mono ${r.covered ? "text-emerald-400" : "text-zinc-500"}`}>
                {r.covered ? "Yes" : "No"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
