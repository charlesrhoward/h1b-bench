import EvidenceSection from "@/components/cheap-labor/evidence-section";
import EvidenceDetails from "@/components/cheap-labor/evidence-details";
import { BackWagesByYear, BackWagesTable, fmtMillions } from "@/components/cheap-labor/back-wages";
import { totalWhd, type WhdTopEmployer, type WhdYear } from "@/lib/cheap-labor";
import { fmtInt } from "@/lib/format";
import { REPO_URL } from "@/lib/site";

const WHD_DATA_URL = "https://data.dol.gov/data-catalog/WHD/enforcement/WHD_enforcement.zip";

/** Section 05: H-1B back wages from DOL Wage and Hour Division enforcement. */
export default function BackWagesSection({
  index,
  years,
  top,
}: {
  index: number;
  years: WhdYear[];
  top: WhdTopEmployer[];
}) {
  if (years.length === 0) return null;
  const totals = totalWhd(years);
  const first = years[0].fiscal_year;
  return (
    <EvidenceSection
      index={index}
      title={`${fmtMillions(totals.back_wages)} in back wages. Documented violations.`}
      takeaway="These cases establish that violations occurred. They cannot tell us how common violations are across all H-1B employers."
      limits="DOL investigates a small share of employers, so these cases measure enforcement, not the full rate of violations. The data holds concluded cases only, so recent years are incomplete. Back wages are amounts the employer agreed to pay. The data does not show if the employer paid. The totals count only cases that have a findings date."
      source={
        <>
          <a href={WHD_DATA_URL} className="text-emerald-400 hover:underline">
            DOL Wage and Hour Division, concluded compliance actions
          </a>
          , H-1B cases with findings from FY{first}.{" "}
          <a href={`${REPO_URL}/blob/main/docs/back-wages-method.md`} className="text-emerald-400 hover:underline">
            Method
          </a>
          , committed before the results.
        </>
      }
    >
      <p>
        DOL&apos;s Wage and Hour Division found H-1B violations in {fmtInt(totals.cases)} cases. In
        these cases, employers agreed to pay {fmtMillions(totals.back_wages)} in back wages to{" "}
        {fmtInt(totals.employees)} workers. DOL also assessed {fmtMillions(totals.penalties)} in
        penalties.
      </p>
      <p className="chart-period">Concluded cases · FY{first}–FY{years.at(-1)?.fiscal_year}</p>
      <BackWagesByYear years={years} />
      <p className="text-sm text-zinc-400">
        Back wages by fiscal year of the findings. Each bar shows the number of cases on hover.
      </p>
      <EvidenceDetails title="View the employers with the most back wages">
        <BackWagesTable rows={top} />
      </EvidenceDetails>
    </EvidenceSection>
  );
}
