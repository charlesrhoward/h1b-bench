import StatCard from "@/components/stat-card";
import { fmtMonth } from "@/components/cheap-labor/layoff-filings-tables";
import type { LayoffFilingsCompany, LayoffFilingsSummary } from "@/lib/cheap-labor";
import { fmtInt } from "@/lib/format";

/** The three steps behind the finding, in the order they happen. */
export function LayoffFilingsSteps({ summary, noticeRange }: { summary: LayoffFilingsSummary; noticeRange: string }) {
  return (
    <ol className="max-w-3xl list-decimal space-y-3 pl-6 marker:font-ui marker:text-neutral-secondary">
      <li>
        <span className="font-semibold">The layoff.</span> Before a large layoff, a company must send a WARN
        notice to the state. We use {fmtInt(summary.notices_in_window)} notices from {summary.states} states, dated{" "}
        {noticeRange}.
      </li>
      <li>
        <span className="font-semibold">The match.</span> {fmtInt(summary.notices_matched)} of these notices are
        from companies that also file for H-1B workers. The company names must match exactly.
      </li>
      <li>
        <span className="font-semibold">The filings after.</span> For each notice, we count the company&apos;s
        certified H-1B filings in the next 12 months for workers who are new to the company. Extensions for
        current workers do not count.
      </li>
    </ol>
  );
}

/** Headline counts for the notices that new-worker filings followed. */
export function LayoffFilingsStats({ summary }: { summary: LayoffFilingsSummary }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 py-2 sm:grid-cols-4">
      <StatCard label={`Workers in those ${fmtInt(summary.notices_followed)} notices`} value={fmtInt(summary.workers_laid_off)} />
      <StatCard label="New-worker H-1B filings in the next 12 months" value={fmtInt(summary.filings_after)} />
      <StatCard label="Positions those filings allow, at most" value={fmtInt(summary.positions_after)} />
      <StatCard label="Notices with a new filing within 90 days" value={fmtInt(summary.notices_followed_90)} />
    </div>
  );
}

/**
 * New-worker filings in the 12 months before and after any of the companies' matched layoff notices, on
 * one scale. "Before" covers every matched notice, not only followed ones; a notice no filing followed
 * has no "after" filings by definition, so both sides cover the same notices.
 * Same bar rows as ComparisonChart, but raw counts on a shared max instead of shares of a total.
 */
export function LayoffFilingsBeforeAfter({ summary }: { summary: LayoffFilingsSummary }) {
  const rows = [
    { label: "12 months before any of their layoff notices", count: summary.filings_before, tone: "bg-chart-neutral-primary" },
    { label: "12 months after any of their layoff notices", count: summary.filings_after, tone: "bg-chart-accent-primary" },
  ];
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <figure className="space-y-4 py-2 font-ui">
      <figcaption className="text-sm font-medium text-neutral-primary">
        New-worker H-1B filings by the same {fmtInt(summary.companies_followed)} companies
      </figcaption>
      <div className="space-y-4">
        {rows.map((row) => (
          <div className="space-y-2" key={row.label}>
            <div className="flex items-baseline justify-between gap-4 text-sm text-neutral-primary">
              <span>{row.label}</span>
              <strong className="shrink-0 font-semibold tabular-nums">{fmtInt(row.count)}</strong>
            </div>
            <div className="h-3 overflow-hidden rounded-sm bg-chart-neutral-tertiary" aria-hidden="true">
              <div className={`h-full ${row.tone}`} style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

/** The listed company with the most new-worker filings after its notices, as a worked example. */
export function LayoffFilingsExample({ companies }: { companies: LayoffFilingsCompany[] }) {
  const example = companies.reduce<LayoffFilingsCompany | null>(
    (best, c) => (best && best.filings_after >= c.filings_after ? best : c),
    null,
  );
  if (!example) return null;
  return (
    <p>
      An example: of the companies in the table below, {example.company} filed the most after its notices. Its
      layoff notices that a new filing followed ({example.states.replaceAll(",", ", ")}, the first in{" "}
      {fmtMonth(example.first_notice)}) were for {fmtInt(example.workers_laid_off)} workers. In the 12 months after them, it filed{" "}
      {fmtInt(example.filings_after)} H-1B filings for new workers, {fmtInt(example.filings_after_90)} of them within
      90 days. In the 12 months before any of its layoff notices, it filed {fmtInt(example.filings_before)}.
    </p>
  );
}
