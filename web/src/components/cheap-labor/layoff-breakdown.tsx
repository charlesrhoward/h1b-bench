import type { LayoffFilingsBreakdown } from "@/lib/cheap-labor";
import { fmtInt, fmtPct } from "@/lib/format";

type Part = { label: string; detail: string; value: number; swatch: string; counted: boolean };

function parts(row: LayoffFilingsBreakdown): Part[] {
  return [
    {
      label: "New employment",
      detail: "a worker new to the company",
      value: row.filings_after_new_employment,
      swatch: "bg-chart-accent-primary",
      counted: true,
    },
    {
      label: "Change of employer",
      detail: "a worker who moves from another H-1B employer",
      value: row.filings_after_change_employer,
      swatch: "bg-chart-accent-tertiary",
      counted: true,
    },
    {
      label: "Extensions and amendments",
      detail: "current workers only; not counted",
      value: row.filings_after_not_counted,
      swatch: "bg-chart-neutral-tertiary",
      counted: false,
    },
  ];
}

/**
 * Method measure 7 (docs/layoff-filings-method.md): the certified H-1B filings in the 12 months
 * after the layoff notices, by type. Shows that extensions are left out of the count.
 */
export default function LayoffBreakdown({ row }: { row: LayoffFilingsBreakdown }) {
  const all = row.filings_after_new_employment + row.filings_after_change_employer + row.filings_after_not_counted;
  if (all === 0) return null;
  const rows = parts(row);
  return (
    <figure className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full" aria-hidden="true">
        {rows.map((p) => (
          <div key={p.label} className={p.swatch} style={{ width: `${(p.value / all) * 100}%` }} />
        ))}
      </div>
      <table className="w-full text-[13px]">
        <caption className="sr-only">All certified H-1B filings in the 12 months after the layoff notices, by type</caption>
        <tbody>
          {rows.map((p) => (
            <tr key={p.label} className={p.counted ? "" : "text-neutral-secondary"}>
              <td className="py-0.5 pr-2 align-top">
                <span className={`mr-2 inline-block size-2 rounded-full ${p.swatch}`} aria-hidden="true" />
                <span className="font-medium">{p.label}</span>{" "}
                <span className="text-neutral-secondary">({p.detail})</span>
              </td>
              <td className="py-0.5 text-right align-top tabular-nums">{fmtInt(p.value)}</td>
              <td className="w-14 py-0.5 text-right align-top tabular-nums text-neutral-secondary">
                {fmtPct(p.value, all)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
