import type { EmployerLayoffTimeline, LayoffNotice } from "@/lib/cheap-labor";
import { fmtInt } from "@/lib/format";
import { fmtDay, layoffTimelineModel } from "@/lib/layoff-timeline";
import EvidenceDetails from "@/components/cheap-labor/evidence-details";
import TimelineFigure from "@/components/timeline/timeline-figure";

const NOTES = [
  "A filing is dated by the day the employer sent it. A filing is a step before a visa. It is not a hire.",
  "WARN notices do not list jobs. The H-1B jobs can be different jobs from the jobs that were cut.",
  "Notices: Oct 2020 to Jun 2025. Filings: Oct 2019 to May 2026. The last months can be a little low, because some filings were still in review when the data ends.",
  "Some states give the date the state received the notice, not the date of the notice.",
  "The counts include every employer name that matches the company name.",
];

const READOUT =
  "Each yellow dot is a WARN layoff notice. A larger dot means more workers. The bars show certified H-1B filings by the month the company sent them. The shaded area is the 12 months after a notice.";

const SOURCE =
  "DOL OFLC LCA disclosure data (FY2020 to FY2026 Q3); WARN notices from state labor agencies, compiled on Hugging Face (APProjects), and the California EDD WARN reports.";

function NoticeRow({ notice }: { notice: LayoffNotice }) {
  return (
    <tr>
      <td className="whitespace-nowrap tabular-nums">{fmtDay(notice.notice_date)}</td>
      <td>{notice.state}</td>
      <td className="text-neutral-secondary">{notice.location ?? "—"}</td>
      <td className="text-right tabular-nums">{notice.workers == null ? "—" : fmtInt(notice.workers)}</td>
      <td className="text-right tabular-nums">{fmtInt(notice.filings_after)}</td>
      <td className="text-right tabular-nums">{fmtInt(notice.filings_before)}</td>
    </tr>
  );
}

function NoticeTable({ notices }: { notices: LayoffNotice[] }) {
  return (
    <table className="w-full">
      <caption className="sr-only">WARN layoff notices with H-1B filings for new workers in the 12 months before and after each</caption>
      <thead>
        <tr>
          <th>Notice date</th>
          <th>State</th>
          <th>Site on the notice</th>
          <th className="text-right">Workers</th>
          <th className="text-right">Filings, next 12 months</th>
          <th className="text-right">Filings, past 12 months</th>
        </tr>
      </thead>
      <tbody>
        {notices.map((n, i) => (
          <NoticeRow key={`${n.notice_date}-${n.state}-${i}`} notice={n} />
        ))}
      </tbody>
    </table>
  );
}

/**
 * Method measure 8 (docs/layoff-filings-method.md): an employer's WARN layoff notices on one
 * line with its certified H-1B filings by month. Every flagged employer gets the same chart from
 * its own rows. Renders nothing without rows.
 */
export default function LayoffTimeline({ timeline, employer }: { timeline: EmployerLayoffTimeline | null; employer: string }) {
  if (!timeline) return null;
  const model = layoffTimelineModel(timeline);
  return (
    <section className="space-y-6">
      <div className="max-w-3xl space-y-2">
        <h2 className="type-heading">Layoffs and H-1B filings over time</h2>
        <p className="type-small">
          Point to a dot or a bar to see the details. The table under the chart lists each notice.
        </p>
      </div>
      <TimelineFigure
        model={model}
        label={`Timeline of ${employer}'s WARN layoff notices and certified H-1B filings by month`}
        viewLabel="Filings shown"
        readout={READOUT}
        notes={NOTES}
        source={SOURCE}
        method="layoff-filings-method.md"
      />
      <EvidenceDetails title={`All WARN notices (${fmtInt(timeline.notices.length)})`}>
        <NoticeTable notices={timeline.notices} />
      </EvidenceDetails>
    </section>
  );
}
