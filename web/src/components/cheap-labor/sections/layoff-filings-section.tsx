import EvidenceSection from "@/components/cheap-labor/evidence-section";
import EvidenceDetails from "@/components/cheap-labor/evidence-details";
import { LayoffFilingsTable, fmtMonth } from "@/components/cheap-labor/layoff-filings-tables";
import {
  LayoffFilingsBeforeAfter,
  LayoffFilingsExample,
  LayoffFilingsStats,
  LayoffFilingsSteps,
} from "@/components/cheap-labor/layoff-filings-figures";
import type { LayoffFilingsCompany, LayoffFilingsSummary } from "@/lib/cheap-labor";
import { fmtInt, fmtPct } from "@/lib/format";
import { REPO_URL } from "@/lib/site";

const WARN_DATA_URL = "https://huggingface.co/datasets/APProjects/us-warn-act-layoffs-notices-daily";
const WARN_SCRAPER_URL = "https://github.com/biglocalnews/warn-scraper";
const CA_WARN_URL = "https://edd.ca.gov/en/jobs_and_training/Layoff_Services_WARN";

/** Section 06: WARN layoff notices, then H-1B filings for workers new to the company. */
export default function LayoffFilingsSection({
  index,
  summary,
  companies,
}: {
  index: number;
  summary: LayoffFilingsSummary | null;
  companies: LayoffFilingsCompany[];
}) {
  if (!summary) return null;
  const noticeRange = `${fmtMonth(summary.notice_start)} to ${fmtMonth(summary.notice_end)}`;
  return (
    <EvidenceSection
      index={index}
      title="Companies laid off workers, then filed for new H-1B workers."
      takeaway={`${fmtInt(summary.companies_followed)} companies filed ${fmtInt(summary.notices_followed)} layoff notices for ${fmtInt(summary.workers_laid_off)} workers. In the 12 months after those notices, the same companies filed ${fmtInt(summary.filings_after)} H-1B filings for workers new to the company.`}
      limits="An H-1B filing (LCA) is a step before a visa petition. It is not a hire. WARN notices do not list jobs, so the new H-1B jobs can be in different roles, sites, or business units than the layoff. Large employers file for H-1B workers all year, so we also show the year before each notice. WARN applies only to large layoffs, generally 50 or more workers at one site. Some states do not publish a notice date, and we drop those notices. Some states give the date the state received the notice instead. California lists each site of a layoff as its own notice. Company names must match exactly, so these counts are lower than the true totals."
      source={
        <>
          DOL OFLC LCA disclosure data, certified H-1B filings, FY2020 to FY2026 Q3. WARN notices,{" "}
          {noticeRange}: California from the{" "}
          <a href={CA_WARN_URL} className="link">
            EDD yearly WARN reports
          </a>
          , and {summary.states - 1} other states from a{" "}
          <a href={WARN_DATA_URL} className="link">
            compilation of state labor agency sites
          </a>{" "}
          made with the{" "}
          <a href={WARN_SCRAPER_URL} className="link">
            Big Local News WARN scraper
          </a>
          .{" "}
          <a href={`${REPO_URL}/blob/main/docs/layoff-filings-method.md`} className="link">
            Method
          </a>
          , committed before the results.
        </>
      }
    >
      <LayoffFilingsSteps summary={summary} noticeRange={noticeRange} />
      <p>
        After {fmtPct(summary.notices_followed, summary.notices_matched)} of the matched notices (
        {fmtInt(summary.notices_followed)} of {fmtInt(summary.notices_matched)}), the company filed for at least
        one new H-1B worker within 12 months. Those notices are the ones we count below.
      </p>
      <LayoffFilingsStats summary={summary} />
      <p>
        The layoffs did not stop the H-1B filings. In the 12 months after any of their layoff notices, these
        companies filed {fmtPct(summary.filings_after, summary.filings_before)} as many new-worker filings as in the
        12 months before any of them.{" "}
        {fmtPct(summary.filings_after_same_state, summary.filings_after)} of the filings after a notice were for a
        job in the same state as the layoff.
      </p>
      <LayoffFilingsBeforeAfter summary={summary} />
      <LayoffFilingsExample companies={companies} />
      <p>The records do not show that the new H-1B workers replaced the workers who were laid off.</p>
      {companies.length > 0 ? (
        <EvidenceDetails title="View the companies with the most workers in these layoff notices">
          <p>Select a company name to see its employer page.</p>
          <LayoffFilingsTable rows={companies} />
        </EvidenceDetails>
      ) : null}
    </EvidenceSection>
  );
}
