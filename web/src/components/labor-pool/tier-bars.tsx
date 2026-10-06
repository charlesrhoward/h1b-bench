import { fmtInt, fmtPct } from "@/lib/format";
import type { LaborPoolSummary, LaborPoolTier } from "@/lib/labor-pool";

const TIER_LABELS: Record<LaborPoolTier, string> = {
  national: "All U.S.",
  recent: "Worked in the last 12 months",
  same_state: "Same state as the job",
};

/** Share of filings that pass the rule in each tier, against the 50% "most" line. */
export default function TierBars({ tiers }: { tiers: LaborPoolSummary[] }) {
  return (
    <div className="space-y-4">
      {tiers.map((t) => {
        const pct = (t.filings_covered / t.filings_total) * 100;
        return (
          <div key={t.tier}>
            <div className="mb-1.5 flex items-baseline justify-between gap-4 text-sm">
              <span className="text-zinc-300">{TIER_LABELS[t.tier]}</span>
              <span className="font-mono text-zinc-400">
                {fmtPct(t.filings_covered, t.filings_total)}
                <span className="ml-2 text-xs text-zinc-500">
                  {fmtInt(t.filings_covered)} of {fmtInt(t.filings_total)}
                </span>
              </span>
            </div>
            <div className="relative h-3 rounded bg-zinc-800">
              <div className="h-full rounded bg-zinc-400" style={{ width: `${pct}%` }} />
              <div
                aria-hidden
                className="absolute inset-y-[-4px] left-1/2 border-l-2 border-dashed border-emerald-400"
              />
            </div>
          </div>
        );
      })}
      <p className="font-mono text-xs text-emerald-400">┆ 50% line: the test needs a bar past it</p>
    </div>
  );
}
