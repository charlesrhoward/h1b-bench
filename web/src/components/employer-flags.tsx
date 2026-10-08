import type { ReactNode } from "react";
import Link from "next/link";
import { CHEAP_LABOR_FY, type EmployerLayoffFilings, type EmployerMarketGap } from "@/lib/cheap-labor";
import { FLAGS_METHOD_PATH, hasFlags, type EmployerFlags } from "@/lib/employer-flags";
import { fmtInt, fmtPct } from "@/lib/format";
import { REPO_URL } from "@/lib/site";
import { fmtGap } from "@/components/cheap-labor/market-gap-tables";
import LayoffBreakdown from "@/components/cheap-labor/layoff-breakdown";

const METHOD_URL = `${REPO_URL}/blob/main/${FLAGS_METHOD_PATH}`;

function underpaidTitle(gap: EmployerMarketGap) {
  return `Underpaid: ${fmtPct(gap.below_median, gap.filings_matched)} of ${fmtInt(gap.filings_matched)} matched FY${CHEAP_LABOR_FY} H-1B filings offer less than the local median pay for the job. Median gap: ${fmtGap(gap.median_gap)} a year.`;
}

function layoffsTitle(row: EmployerLayoffFilings) {
  return `Layoffs: WARN notices for ${fmtInt(row.workers_laid_off)} workers. In the 12 months after them, the company filed ${fmtInt(row.filings_after)} certified H-1B filings for new workers.`;
}

/** Small solid-red labels for tables and the page header. Renders nothing when the employer has no flag. */
export function EmployerFlagPills({ flags }: { flags: EmployerFlags | undefined }) {
  if (!hasFlags(flags)) return null;
  return (
    <span className="inline-flex flex-wrap gap-1.5 align-middle">
      {flags.underpaid ? (
        <span className="flag rounded-sm px-1.5 py-0.5 text-[10px] leading-none" title={underpaidTitle(flags.underpaid)}>
          Underpaid
        </span>
      ) : null}
      {flags.layoffs ? (
        <span className="flag rounded-sm px-1.5 py-0.5 text-[10px] leading-none" title={layoffsTitle(flags.layoffs)}>
          Layoffs
        </span>
      ) : null}
    </span>
  );
}

function FlagCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <article className="flag-frame flex flex-col">
      <h2 className="flag px-4 py-2.5 text-sm">
        <span aria-hidden="true">▲ </span>
        {label}
      </h2>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">{children}</div>
    </article>
  );
}

function UnderpaidCard({ gap }: { gap: EmployerMarketGap }) {
  return (
    <FlagCard label="Underpaid">
      <p className="type-figure text-[2.75rem] text-error-primary sm:text-[3.25rem]">
        {fmtPct(gap.below_median, gap.filings_matched)}
      </p>
      <p className="type-small font-medium">
        of its matched H-1B filings (FY{CHEAP_LABOR_FY}) offer less than the local median pay for the job. The
        median gap is {fmtGap(gap.median_gap)} a year. Matched filings: {fmtInt(gap.filings_matched)}.
      </p>
      <p className="type-meta mt-auto">
        Offered pay is the bottom of the offered range. The employer can pay more. The local median includes workers
        at all experience levels.{" "}
        <Link href="/pay-vs-market#finding-1" className="link">
          Finding
        </Link>{" "}
        ·{" "}
        <a href={METHOD_URL} className="link">
          How we flag
        </a>
      </p>
    </FlagCard>
  );
}

function LayoffsCard({ row }: { row: EmployerLayoffFilings }) {
  return (
    <FlagCard label="Layoffs, then H-1B filings">
      <p className="type-figure text-[2.75rem] text-error-primary sm:text-[3.25rem]">{fmtInt(row.workers_laid_off)}</p>
      <p className="type-small font-medium">
        workers in WARN layoff notices ({row.states.replaceAll(",", ", ")}). In the 12 months after them, the company
        filed {fmtInt(row.filings_after)} certified H-1B filings for workers new to the company. Extensions are not
        in that number.
      </p>
      <LayoffBreakdown row={row} />
      <p className="type-meta mt-auto">
        This shows the order of events only. It does not show that H-1B workers replaced the workers who were laid
        off. A filing is not a hire.{" "}
        <Link href="/pay-vs-market#finding-6" className="link">
          Finding
        </Link>{" "}
        ·{" "}
        <a href={METHOD_URL} className="link">
          How we flag
        </a>
      </p>
    </FlagCard>
  );
}

/** Large warning cards at the top of an employer page. Renders nothing when the employer has no flag. */
export function EmployerFlagCards({ flags }: { flags: EmployerFlags }) {
  if (!hasFlags(flags)) return null;
  return (
    <section aria-label="Warnings" className="grid gap-4 md:grid-cols-2">
      {flags.underpaid ? <UnderpaidCard gap={flags.underpaid} /> : null}
      {flags.layoffs ? <LayoffsCard row={flags.layoffs} /> : null}
    </section>
  );
}
