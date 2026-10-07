import { fmtInt, fmtPct } from "@/lib/format";
import { fillablePositions, type LaborPoolOccupation } from "@/lib/labor-pool";

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
      <table className="w-full sm:min-w-[52rem]" data-hide="2 3 7">
        <thead>
          <tr>
            <th>Occupation</th>
            <th className="text-right">H-1B filings</th>
            <th className="text-right">Share</th>
            <th className="text-right">New H-1B positions</th>
            <th className="text-right" title="Unemployed, bachelor's degree or higher, last job in this occupation. ± is the 90% margin of error.">
              Unemployed, bachelor&apos;s+
            </th>
            <th className="text-right" title="Share of new H-1B positions the unemployed alone could fill (Measure 2)">
              Could fill
            </th>
            <th className="text-right" title="Measure 1: the unemployed can fill all new H-1B positions">
              Passes
            </th>
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
                <span className="block text-xs text-zinc-500 sm:ml-1 sm:inline">±{fmtInt(r.supply_moe)}</span>
              </td>
              <td className="text-right font-mono">{fmtPct(fillablePositions(r), r.new_positions)}</td>
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
