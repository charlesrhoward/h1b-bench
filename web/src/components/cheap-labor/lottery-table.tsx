import { fmtInt, fmtPct } from "@/lib/format";
import { BENEFICIARY_CENTRIC_FROM, type UscisRegistrationYear } from "@/lib/cheap-labor";

/** Eligible registrations per cap year, split by people with one or more registrations. */
export function LotteryBars({ years }: { years: UscisRegistrationYear[] }) {
  const max = Math.max(...years.map((y) => y.eligible_registrations), 1);
  return (
    <div className="space-y-2" role="list" aria-label="Eligible H-1B registrations by cap fiscal year">
      {years.map((y) => (
        <div key={y.cap_fiscal_year} role="listitem" className="flex items-center gap-3">
          <span className="w-14 shrink-0 font-mono text-xs text-zinc-500">FY{y.cap_fiscal_year}</span>
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
            <div className="bg-zinc-600" style={{ flexGrow: y.eligible_single }} />
            <div className="bg-amber-400/80" style={{ flexGrow: y.eligible_multiple }} />
          </div>
        </div>
      ))}
      <div aria-hidden="true" className="flex gap-4 pt-1 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 bg-zinc-600" /> One registration
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 bg-amber-400/80" /> Multiple registrations
        </span>
      </div>
    </div>
  );
}

/** The published USCIS counts with the multiple-registration share per year. */
export function LotteryTable({ years }: { years: UscisRegistrationYear[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full sm:min-w-[40rem]" data-hide="2 5">
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
              <td className="font-mono">
                FY{y.cap_fiscal_year}
                {y.cap_fiscal_year === BENEFICIARY_CENTRIC_FROM ? (
                  <span className="ml-2 text-xs text-zinc-500">new rule</span>
                ) : null}
              </td>
              <td className="text-right font-mono">{fmtInt(y.eligible_registrations)}</td>
              <td className="text-right font-mono">{fmtInt(y.eligible_multiple)}</td>
              <td className="text-right font-mono">{fmtPct(y.eligible_multiple, y.eligible_registrations)}</td>
              <td className="text-right font-mono">{fmtInt(y.selected_registrations)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
