import type { ExploreEmployer } from "@/lib/explore-model";
import { EMPLOYER_METRICS } from "@/lib/explore-stats";
import { fmtInt, fmtMoney } from "@/lib/format";
import { stateName } from "@/lib/us-states";
import { COMPARE_SWATCHES } from "./compare-colors";

/** `text` rows wrap; number rows stay on one line. */
type Row = { label: string; value: (e: ExploreEmployer) => string; text?: boolean };

const orDash = <T,>(value: T | null, format: (v: T) => string) => (value == null ? "—" : format(value));

const ROWS: Row[] = [
  { label: "H-1B LCA filings, FY2025", value: (e) => fmtInt(e.filings) },
  { label: "Certified", value: (e) => fmtInt(e.certified) },
  { label: "Worker positions", value: (e) => orDash(e.workers, fmtInt) },
  { label: "Median offered pay", value: (e) => orDash(e.medianWage, fmtMoney) },
  { label: "Filings below local median", value: (e) => orDash(e.belowMedianPct, EMPLOYER_METRICS.belowMedianPct.format) },
  { label: "Median gap to local median", value: (e) => orDash(e.medianGap, EMPLOYER_METRICS.medianGap.format) },
  { label: "% of workforce (approx.)", value: (e) => orDash(e.workforcePct, EMPLOYER_METRICS.workforcePct.format) },
  { label: "H-1B back wages owed, since FY2005", value: (e) => (e.backWages == null ? "None found" : `${fmtMoney(e.backWages)} (${fmtInt(e.whdCases)} ${e.whdCases === 1 ? "case" : "cases"})`) },
  { label: "Laid off in WARN notices, then new H-1B filings within 12 months (Oct 2020 to Jun 2025)", value: (e) => (e.laidOff == null ? "None found" : `${fmtInt(e.laidOff)} laid off (${e.warnStates}); ${fmtInt(e.filingsAfterLayoff)} filings after`) },
  { label: "Most common job title", value: (e) => e.topJob ?? "—", text: true },
  { label: "Most common worksite state", value: (e) => orDash(e.topState, stateName), text: true },
];

/** The compared employers side by side, one row per fact. */
export default function CompareTable({ compared }: { compared: ExploreEmployer[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] table-fixed font-ui">
        <thead>
          <tr className="border-b">
            <th scope="col" className="w-1/4">
              <span className="sr-only">Measure</span>
            </th>
            {compared.map((e, i) => (
              <th key={e.id} scope="col" className="text-right whitespace-normal">
                <span className="inline-flex items-center gap-1.5 text-neutral-primary">
                  <span aria-hidden className={`size-2 shrink-0 rounded-full ${COMPARE_SWATCHES[i]}`} />
                  {e.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="py-3 align-top font-normal">
                {row.label}
              </th>
              {compared.map((e) => (
                <td key={e.id} className={row.text ? "text-right" : "text-right tabular-nums"}>
                  {row.value(e)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
