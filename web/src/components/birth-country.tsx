import { fmtInt, fmtPct } from "@/lib/format";
import type { BirthCountryRow, BirthCountryYear } from "@/lib/queries";

const SEGMENT_TONES = ["bg-chart-accent-primary", "bg-chart-accent-secondary", "bg-chart-neutral-primary"];
const OTHER_LABEL = "All other places and unknown";

/** Approvals left after the listed places, or null if a listed place has no count that year. */
function otherApproved(year: BirthCountryYear, places: readonly BirthCountryRow[]) {
  let rest = year.approved;
  for (const place of places) {
    const count = place.approved[year.fiscal_year];
    if (count == null) return null;
    rest -= count;
  }
  return rest;
}

/** One full-width bar per fiscal year: the two leading places of birth, then everyone else. */
export function BirthCountryBars({ years, countries }: { years: BirthCountryYear[]; countries: BirthCountryRow[] }) {
  const leaders = countries.slice(0, 2);
  const labels = [...leaders.map((c) => c.country), OTHER_LABEL];
  return (
    <div className="space-y-2 font-ui" role="list" aria-label="Approved H-1B petitions by country of birth, by fiscal year">
      {years.map((y) => {
        const other = otherApproved(y, leaders);
        if (other == null) return null;
        const segments = [...leaders.map((c) => c.approved[y.fiscal_year]), other];
        return (
          <div key={y.fiscal_year} role="listitem" className="flex items-center gap-3">
            <span className="w-14 shrink-0 tabular-nums text-xs text-neutral-secondary">FY{y.fiscal_year}</span>
            <span className="sr-only">
              {segments.map((count, i) => `${labels[i]}: ${fmtPct(count, y.approved)}`).join(", ")}.
            </span>
            <div aria-hidden="true" className="flex h-4 w-full overflow-hidden rounded-sm">
              {segments.map((count, i) => (
                <div
                  key={labels[i]}
                  className={SEGMENT_TONES[i]}
                  style={{ flexGrow: count }}
                  title={`${labels[i]}: ${fmtPct(count, y.approved)}`}
                />
              ))}
            </div>
          </div>
        );
      })}
      <div aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-neutral-secondary">
        {labels.map((label, i) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`inline-block size-2.5 rounded-sm ${SEGMENT_TONES[i]}`} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Share of each year's approved petitions for the leading places of birth. */
export function BirthCountryTable({ years, countries }: { years: BirthCountryYear[]; countries: BirthCountryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" data-hide="3 5">
        <thead>
          <tr>
            <th scope="col">Country of birth</th>
            {years.map((y) => (
              <th key={y.fiscal_year} scope="col" className="text-right">
                FY{String(y.fiscal_year).slice(2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {countries.map((c) => (
            <tr key={c.country}>
              <td className="font-medium">{c.country}</td>
              {years.map((y) => (
                <td key={y.fiscal_year} className="text-right tabular-nums">
                  {fmtPct(c.approved[y.fiscal_year], y.approved)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="text-neutral-secondary">{OTHER_LABEL}</td>
            {years.map((y) => (
              <td key={y.fiscal_year} className="text-right tabular-nums text-neutral-secondary">
                {fmtPct(otherApproved(y, countries), y.approved)}
              </td>
            ))}
          </tr>
          <tr>
            <td className="text-neutral-secondary">Approved petitions</td>
            {years.map((y) => (
              <td key={y.fiscal_year} className="text-right tabular-nums text-neutral-secondary">
                {fmtInt(y.approved)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
