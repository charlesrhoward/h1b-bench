import { fmtPct } from "@/lib/format";

type Comparison = { label: string; count: number; total: number };

/** Direct labels and a common 0–100% scale make the comparison readable without hover. */
export default function ComparisonChart({ title, rows, note }: {
  title: string;
  rows: Comparison[];
  note: string;
}) {
  return (
    <figure className="comparison-chart">
      <figcaption>{title}</figcaption>
      <div className="comparison-rows">
        {rows.map((row, index) => (
          <div className="comparison-row" key={row.label}>
            <div className="comparison-label">
              <span>{row.label}</span>
              <strong>{fmtPct(row.count, row.total)}</strong>
            </div>
            <div className="comparison-track" aria-hidden="true">
              <div className={index === 0 ? "comparison-fill" : "comparison-fill comparison-fill-muted"}
                style={{ width: `${row.total > 0 ? (row.count / row.total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="chart-note">{note}</p>
    </figure>
  );
}
