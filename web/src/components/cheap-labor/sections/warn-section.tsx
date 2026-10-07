import EvidenceSection from "@/components/cheap-labor/evidence-section";
import EvidenceDetails from "@/components/cheap-labor/evidence-details";
import { WarnCompanyTable } from "@/components/cheap-labor/warn-tables";
import { CHEAP_LABOR_FY, type WarnCompany, type WarnSummary } from "@/lib/cheap-labor";
import { fmtInt } from "@/lib/format";
import { REPO_URL } from "@/lib/site";

const TX_WARN_URL = "https://data.texas.gov/dataset/WARN-Notices/8w53-c4f6";
const CA_WARN_URL =
  "https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn-report-for-7-1-2024-to-06-30-2025.pdf";

/** Section 06: WARN layoff notices from employers with certified H-1B filings. */
export default function WarnSection({
  index,
  summary,
  companies,
}: {
  index: number;
  summary: WarnSummary | null;
  companies: WarnCompany[];
}) {
  if (!summary) return null;
  return (
    <EvidenceSection
      index={index}
      title="Layoff notices and H-1B filings can overlap."
      takeaway="Some employers filed for H-1B workers in the same year they announced layoffs. The records do not show that one group replaced the other."
      limits="WARN notices do not list jobs, so a layoff can be in different roles than the H-1B filings. WARN applies only to large layoffs, generally 50 or more workers at one site. The data covers two states, and California covers 9 of the 12 months. A notice under a site or brand name does not match, so these counts are lower than the true totals."
      source={
        <>
          DOL OFLC LCA disclosure data, certified H-1B filings, FY{CHEAP_LABOR_FY}.{" "}
          <a href={TX_WARN_URL} className="text-emerald-400 hover:underline">
            Texas Workforce Commission WARN notices
          </a>
          , Oct 2024 to Sep 2025.{" "}
          <a href={CA_WARN_URL} className="text-emerald-400 hover:underline">
            California EDD WARN report
          </a>
          , Oct 2024 to Jun 2025.{" "}
          <a href={`${REPO_URL}/blob/main/docs/warn-method.md`} className="text-emerald-400 hover:underline">
            Method
          </a>
          , committed before the results.
        </>
      }
    >
      <p>
        A WARN notice tells the state about a large layoff before it occurs. We matched notices in
        Texas and California to employers with certified H-1B filings in the same fiscal year. The
        company names must match exactly.
      </p>
      <p>
        <span className="font-semibold text-zinc-100">{fmtInt(summary.companies_matched)}</span>{" "}
        companies filed {fmtInt(summary.notices_matched)} WARN notices to lay off{" "}
        {fmtInt(summary.workers_laid_off)} workers. In the same year, these companies had{" "}
        {fmtInt(summary.h1b_filings)} H-1B filings certified.
      </p>
      {companies.length > 0 ? (
        <EvidenceDetails title="View the matched companies and layoff notices">
          <p>The matched companies with the most workers in WARN notices:</p>
          <WarnCompanyTable rows={companies} />
        </EvidenceDetails>
      ) : null}
    </EvidenceSection>
  );
}
