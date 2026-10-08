import Link from "next/link";
import { fmtInt, fmtPct } from "@/lib/format";
import type { EmployerMarketGap, MarketGapSummary } from "@/lib/cheap-labor";
import { getEmployerLinker } from "@/lib/employer-tickers";

const DEPENDENCY_LABELS: Record<MarketGapSummary["dependency"], string> = {
  all: "All employers",
  true: "“H-1B dependent” employers",
  false: "Other employers",
  unknown: "Not stated",
};

/** Signed dollar amount, e.g. -$6,834 or +$2,163. */
export function fmtGap(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n === 0) return "$0";
  return `${n < 0 ? "−" : "+"}$${fmtInt(Math.abs(n))}`;
}

/** Share below the local median and median gap, per employer type. */
export function MarketGapTable({ rows }: { rows: MarketGapSummary[] }) {
  const order: MarketGapSummary["dependency"][] = ["all", "true", "false", "unknown"];
  const ordered = [...rows].sort((a, b) => order.indexOf(a.dependency) - order.indexOf(b.dependency));
  return (
    <div className="overflow-x-auto">
      <table className="w-full" data-hide="2">
        <thead>
          <tr>
            <th>Employer type</th>
            <th className="text-right">Matched filings</th>
            <th className="text-right">Below local median</th>
            <th className="text-right">Median gap</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((r) => (
            <tr key={r.dependency}>
              <td>{DEPENDENCY_LABELS[r.dependency]}</td>
              <td className="text-right tabular-nums">{fmtInt(r.filings_matched)}</td>
              <td className="text-right tabular-nums">{fmtPct(r.below_median, r.filings_matched)}</td>
              <td className="text-right tabular-nums">{fmtGap(r.median_gap)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Large sponsors with the highest share of filings below the local median. */
export async function BelowMedianLeaders({ rows }: { rows: EmployerMarketGap[] }) {
  const employerHref = await getEmployerLinker();
  return (
    <div className="overflow-x-auto">
      <table className="w-full" data-hide="2">
        <thead>
          <tr>
            <th>Employer</th>
            <th className="text-right">Matched filings</th>
            <th className="text-right">Below local median</th>
            <th className="text-right">Median gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.employer_id}>
              <td>
                <Link href={employerHref({ id: r.employer_id, name: r.employers?.name ?? `Employer ${r.employer_id}` })} className="hover:text-accent-primary">
                  {r.employers?.name ?? `Employer ${r.employer_id}`}
                </Link>
              </td>
              <td className="text-right tabular-nums">{fmtInt(r.filings_matched)}</td>
              <td className="text-right tabular-nums">{fmtPct(r.below_median, r.filings_matched)}</td>
              <td className="text-right tabular-nums">{fmtGap(r.median_gap)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
