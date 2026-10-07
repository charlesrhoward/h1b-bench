import { fmtPct } from "@/lib/format";
import { WAGE_LEVEL_PERCENTILES } from "@/lib/cheap-labor";

const SEGMENT_TONE: Record<keyof typeof WAGE_LEVEL_PERCENTILES, string> = {
  I: "bg-emerald-400",
  II: "bg-emerald-300/70",
  III: "bg-zinc-500",
  IV: "bg-zinc-600",
};

/** Stacked bar of filings by DOL wage level, each labeled with its local-wage percentile. */
export default function WageLevelBar({
  levels,
  known,
}: {
  levels: readonly { level: keyof typeof WAGE_LEVEL_PERCENTILES; count: number }[];
  known: number;
}) {
  return (
    <figure className="space-y-3">
      <figcaption className="text-sm font-medium text-zinc-100">Share of filings at each wage level</figcaption>
      <div className="flex h-4 overflow-hidden rounded" aria-hidden="true">
        {levels.map((l) => (
          <div
            key={l.level}
            className={SEGMENT_TONE[l.level]}
            style={{ width: known > 0 ? `${(l.count / known) * 100}%` : "0%" }}
            title={`Level ${l.level}: ${fmtPct(l.count, known)}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {levels.map((l) => (
          <div key={l.level} className="text-sm">
            <div className="flex items-center gap-2">
              <span className={`size-2.5 rounded-sm ${SEGMENT_TONE[l.level]}`} />
              <span className="font-mono text-zinc-100">{fmtPct(l.count, known)}</span>
            </div>
            <div className="mt-0.5 text-xs text-zinc-500">
              Level {l.level} · {WAGE_LEVEL_PERCENTILES[l.level]}th percentile
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}
