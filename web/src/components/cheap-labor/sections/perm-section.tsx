import EvidenceSection from "@/components/cheap-labor/evidence-section";
import EvidenceDetails from "@/components/cheap-labor/evidence-details";
import { PermLayoffTable } from "@/components/cheap-labor/perm-tables";
import { PERM_FY, type PermLayoffEmployer, type PermLockinSummary } from "@/lib/cheap-labor";
import { fmtInt, fmtPct } from "@/lib/format";
import { REPO_URL } from "@/lib/site";

const PERM_DATA_URL = "https://flag.dol.gov/programs/perm";

/** Section 08: green card filings for workers already employed, after layoffs, and the DOL wait. */
export default function PermSection({
  index,
  summary,
  employers,
}: {
  index: number;
  summary: PermLockinSummary | null;
  employers: PermLayoffEmployer[];
}) {
  if (!summary) return null;
  return (
    <EvidenceSection
      index={index}
      title="Most professional green card filings are for existing employees."
      takeaway="The employer often tests the U.S. labor market for a job that its sponsored worker already holds. These records do not show H-1B status."
      limits="The green card file does not show the worker's visa status, so it does not show how many are H-1B workers. Both answers are the employer's own entries on the form. A layoff is lawful if the employer told the laid-off workers about the job and considered them. The data does not show that step. The wait is the DOL step only. The full green card wait is longer."
      source={
        <>
          <a href={PERM_DATA_URL} className="text-emerald-400 hover:underline">
            DOL OFLC PERM disclosure data
          </a>
          , certified filings, FY{PERM_FY}.{" "}
          <a href={`${REPO_URL}/blob/main/docs/perm-lockin-method.md`} className="text-emerald-400 hover:underline">
            Method
          </a>
          , committed before the results.
        </>
      }
    >
      <p>
        To sponsor a worker for a green card, the employer must show that no qualified U.S. worker
        applied for the job. The employer places job ads and reviews the U.S. applicants.
      </p>
      <p>
        In FY{PERM_FY}, the worker already worked for the employer on{" "}
        <span className="font-semibold text-zinc-100">
          {fmtPct(summary.professional_fw_working, summary.professional_certified)}
        </span>{" "}
        of certified filings for professional jobs. For all jobs, the share was{" "}
        {fmtPct(summary.fw_working, summary.certified)}. The employer tests the U.S. labor market
        while its sponsored worker already works for it.
      </p>
      <p>
        <span className="font-semibold text-zinc-100">{fmtInt(summary.layoff_certified)}</span> certified
        filings came from {fmtInt(summary.layoff_employers)} employers that reported a layoff in the area,
        in the occupation or a related occupation, in the 6 months before the filing.
      </p>
      {employers.length > 0 ? (
        <EvidenceDetails title="View green card sponsors that reported prior layoffs"><PermLayoffTable rows={employers} /></EvidenceDetails>
      ) : null}
      <p>
        The DOL approval is for one employer only. A worker who moves to a different employer must
        start a new case with that employer. The DOL step alone took a median of {fmtInt(summary.median_days)} days. For 90% of filings, it took{" "}
        {fmtInt(summary.p90_days)} days or less.
      </p>
    </EvidenceSection>
  );
}
