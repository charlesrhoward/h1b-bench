import { fmtInt, fmtPct } from "@/lib/format";
import type { PwSource, PwSourceSummary, PwSurveyPublisher } from "@/lib/cheap-labor";

export const PW_SOURCE_LABELS: Record<PwSource, string> = {
  oews: "Government data (OEWS)",
  survey: "Private survey, chosen by the employer",
  union: "Union contract",
  dol_determination: "DOL determination",
  federal_contract: "Federal contract wage",
  other: "Other",
};

/** Filings and below-median share per wage-floor source. */
export function PwSourceTable({ rows }: { rows: PwSourceSummary[] }) {
  const total = rows.reduce((sum, r) => sum + r.filings, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[38rem]">
        <thead>
          <tr>
            <th>Where the wage floor came from</th>
            <th className="text-right">Filings</th>
            <th className="text-right">Share</th>
            <th className="text-right">Below local median</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.source}>
              <td>{PW_SOURCE_LABELS[r.source]}</td>
              <td className="text-right font-mono">{fmtInt(r.filings)}</td>
              <td className="text-right font-mono text-zinc-500">{fmtPct(r.filings, total)}</td>
              <td className="text-right font-mono">{fmtPct(r.below_median, r.gap_matched)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Private survey publishers by filings, with their below-median share. */
export function PwPublisherTable({ rows }: { rows: PwSurveyPublisher[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem]">
        <thead>
          <tr>
            <th>Survey publisher</th>
            <th className="text-right">Filings</th>
            <th className="text-right">Below local median</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.publisher}>
              <td>{r.publisher}</td>
              <td className="text-right font-mono">{fmtInt(r.filings)}</td>
              <td className="text-right font-mono">{fmtPct(r.below_median, r.gap_matched)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
