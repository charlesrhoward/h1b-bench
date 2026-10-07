import EvidenceSection from "@/components/cheap-labor/evidence-section";
import EvidenceDetails from "@/components/cheap-labor/evidence-details";
import { LotteryBars, LotteryTable } from "@/components/cheap-labor/lottery-table";
import { BENEFICIARY_CENTRIC_FROM, type UscisRegistrationYear } from "@/lib/cheap-labor";
import { fmtInt, fmtPct } from "@/lib/format";
import { REPO_URL } from "@/lib/site";

const USCIS_URL =
  "https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations/h-1b-electronic-registration-process";
const RULE_URL =
  "https://www.federalregister.gov/documents/2024/02/02/2024-01770/improving-the-h-1b-registration-selection-process-and-program-integrity";

/** Section 07: lottery registrations for people with more than one registration. */
export default function LotterySection({ index, years }: { index: number; years: UscisRegistrationYear[] }) {
  const before = years.findLast((y) => y.cap_fiscal_year < BENEFICIARY_CENTRIC_FROM);
  const latest = years.at(-1);
  if (!before || !latest || latest === before) return null;
  return (
    <EvidenceSection
      index={index}
      title="The lottery changed. Multiple registrations fell."
      takeaway="A person once gained more chances through multiple employer registrations. Since FY2025, selection is by person."
      limits="A person can have offers from more than one employer for lawful reasons. Multiple registrations are not a count of fraud. The data does not name employers that coordinated registrations, or measure their pay practices."
      source={
        <>
          <a href={USCIS_URL} className="text-emerald-400 hover:underline">
            USCIS, H-1B Electronic Registration Process, historical data
          </a>
          , cap years FY{years[0].cap_fiscal_year} to FY{latest.cap_fiscal_year}.{" "}
          <a href={RULE_URL} className="text-emerald-400 hover:underline">
            Final rule, Federal Register, February 2, 2024
          </a>
          .{" "}
          <a href={`${REPO_URL}/blob/main/docs/lottery-method.md`} className="text-emerald-400 hover:underline">
            Method
          </a>
          , committed before the results.
        </>
      }
    >
      <p>
        Each year, employers register the people they want to hire. USCIS selects registrations at
        random. Up to the FY{before.cap_fiscal_year} lottery, each registration was one chance of
        selection. A person with registrations from several employers had several chances.
      </p>
      <p>
        In FY{before.cap_fiscal_year},{" "}
        <span className="font-semibold text-zinc-100">{fmtInt(before.eligible_multiple)}</span> of{" "}
        {fmtInt(before.eligible_registrations)} eligible registrations were for people with more than
        one registration ({fmtPct(before.eligible_multiple, before.eligible_registrations)}). USCIS cites evidence from the FY2023 and FY2024 lotteries. It opened fraud
        investigations and changed the rule.
      </p>
      <LotteryBars years={years} />
      <p>
        From FY{BENEFICIARY_CENTRIC_FROM}, USCIS selects by person, so more registrations do not give
        more chances. In FY{latest.cap_fiscal_year}, the share fell to{" "}
        {fmtPct(latest.eligible_multiple, latest.eligible_registrations)}.
      </p>
      <EvidenceDetails title="View lottery registration data by year"><LotteryTable years={years} /></EvidenceDetails>
    </EvidenceSection>
  );
}
