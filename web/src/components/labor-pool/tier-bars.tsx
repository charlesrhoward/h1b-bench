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
            <span className="text-zinc-400">{TIER_LABELS[b.tier]}</span>
            <span className="font-mono text-zinc-300">
              {fmtPct(b.part, b.whole)}
              <span className="ml-2 text-zinc-500">
                {fmtInt(b.part)} of {fmtInt(b.whole)}
              </span>
            </span>
          </div>
          <div className="relative h-2.5 rounded bg-zinc-800">
            <div className="h-full rounded bg-zinc-400" style={{ width: `${(b.part / b.whole) * 100}%` }} />
            <div
              aria-hidden
              className="absolute inset-y-[-3px] left-1/2 border-l-2 border-dashed border-emerald-400"
            />
          </div>
        </div>
      ))}
      <p className="font-mono text-[11px] text-emerald-400">┆ 50% line</p>
    </div>
  );
}
