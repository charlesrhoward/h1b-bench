import { fmtPct } from "@/lib/format";

type Comparison = { label: string; count: number; total: number };

/** Direct labels and a common 0–100% scale make the comparison readable without hover. */
export default function ComparisonChart({ title, rows, note }: {
  title: string;
  rows: Comparison[];
  note: string;
}) {
  return (
    <figure className="space-y-4 py-2 font-ui">
      <figcaption className="text-sm font-medium text-neutral-primary">{title}</figcaption>
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div className="space-y-2" key={row.label}>
            <div className="flex items-baseline justify-between gap-4 text-sm text-neutral-primary">
              <span>{row.label}</span>
              <strong className="shrink-0 font-semibold tabular-nums">{fmtPct(row.count, row.total)}</strong>
            </div>
            <div className="h-3 overflow-hidden rounded-sm bg-chart-neutral-tertiary" aria-hidden="true">
              <div className={`h-full ${index === 0 ? "bg-chart-accent-primary" : "bg-chart-neutral-primary"}`}
                style={{ width: `${row.total > 0 ? (row.count / row.total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="type-meta">{note}</p>
    </figure>
  );
}
