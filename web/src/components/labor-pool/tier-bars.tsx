import { fmtInt, fmtPct } from "@/lib/format";
import type { LaborPoolTier } from "@/lib/labor-pool";

const TIER_LABELS: Record<LaborPoolTier, string> = {
  national: "Unemployed, all U.S.",
  recent: "Unemployed, worked in the last 12 months",
  same_state: "Unemployed, same state as the job",
};

export type TierBar = { tier: LaborPoolTier; part: number; whole: number };

/** One bar per tier, against a dashed 50% line. */
export default function TierBars({ bars }: { bars: TierBar[] }) {
  return (
    <div className="space-y-3">
      {bars.map((b) => (
        <div key={b.tier}>
          <div className="mb-1 flex items-baseline justify-between gap-4 text-xs">
            <span className="text-neutral-secondary">{TIER_LABELS[b.tier]}</span>
            <span className="font-semibold tabular-nums">
              {fmtPct(b.part, b.whole)}
              <span className="ml-2 font-normal text-neutral-secondary">
                {fmtInt(b.part)} of {fmtInt(b.whole)}
              </span>
            </span>
          </div>
          <div className="relative h-2.5 rounded-sm bg-chart-neutral-tertiary">
            <div className="h-full rounded-sm bg-chart-accent-primary" style={{ width: `${(b.part / b.whole) * 100}%` }} />
            <div
              aria-hidden
              className="absolute inset-y-[-3px] left-1/2 border-l-2 border-dashed border-chart-yellow-primary"
            />
          </div>
        </div>
      ))}
      <p className="flex items-center gap-2 text-[11px] text-neutral-secondary">
        <span aria-hidden className="h-3 border-l-2 border-dashed border-chart-yellow-primary" />
        50% line
      </p>
    </div>
  );
}
