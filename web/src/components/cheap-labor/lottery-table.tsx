import { fmtInt, fmtPct } from "@/lib/format";
import { BENEFICIARY_CENTRIC_FROM, type UscisRegistrationYear } from "@/lib/cheap-labor";

/** Eligible registrations per cap year, split by people with one or more registrations. */
export function LotteryBars({ years }: { years: UscisRegistrationYear[] }) {
  const max = Math.max(...years.map((y) => y.eligible_registrations), 1);
  return (
    <div className="space-y-2 font-ui" role="list" aria-label="Eligible H-1B registrations by cap fiscal year">
      {years.map((y) => (
        <div key={y.cap_fiscal_year} role="listitem" className="flex items-center gap-3">
          <span className="w-14 shrink-0 tabular-nums text-xs text-neutral-secondary">FY{y.cap_fiscal_year}</span>
          <span className="sr-only">
            {fmtInt(y.eligible_single)} for people with one registration, {fmtInt(y.eligible_multiple)} for people
            with multiple registrations.
          </span>
          <div
            aria-hidden="true"
            className="flex h-4"
            style={{ width: `${(y.eligible_registrations / max) * 100}%` }}
            title={`${fmtInt(y.eligible_multiple)} of ${fmtInt(y.eligible_registrations)} for people with multiple registrations`}
          >
            <div className="bg-chart-neutral-primary" style={{ flexGrow: y.eligible_single }} />
            <div className="bg-chart-accent-primary" style={{ flexGrow: y.eligible_multiple }} />
          </div>
        </div>
      ))}
      <div aria-hidden="true" className="flex gap-4 pt-1 text-xs text-neutral-secondary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-chart-neutral-primary" /> One registration
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-chart-accent-primary" /> Multiple registrations
        </span>
      </div>
    </div>
  );
}

/** The published USCIS counts with the multiple-registration share per year. */
export function LotteryTable({ years }: { years: UscisRegistrationYear[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" data-hide="2 5">
        <thead>
          <tr>
            <th scope="col">Cap year</th>
            <th scope="col" className="text-right">Eligible registrations</th>
            <th scope="col" className="text-right">For people with multiple</th>
            <th scope="col" className="text-right">Share</th>
            <th scope="col" className="text-right">Selected</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y.cap_fiscal_year}>
              <td className="tabular-nums">
                FY{y.cap_fiscal_year}
                {y.cap_fiscal_year === BENEFICIARY_CENTRIC_FROM ? (
                  <span className="ml-2 text-xs text-neutral-secondary">new rule</span>
                ) : null}
              </td>
              <td className="text-right tabular-nums">{fmtInt(y.eligible_registrations)}</td>
              <td className="text-right tabular-nums">{fmtInt(y.eligible_multiple)}</td>
              <td className="text-right tabular-nums">{fmtPct(y.eligible_multiple, y.eligible_registrations)}</td>
              <td className="text-right tabular-nums">{fmtInt(y.selected_registrations)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
