import { BirthCountryBars, BirthCountryTable } from "@/components/birth-country";
import { fmtInt, fmtPct } from "@/lib/format";
import type { BirthCountryRow, BirthCountryYear } from "@/lib/queries";
import { REPO_URL } from "@/lib/site";

const USCIS_REPORTS_URL = "https://www.uscis.gov/tools/reports-and-studies";

const LIMITS =
  "These are approved petitions, not people. One worker can have more than one approval in a year. Most approvals are extensions or changes of employer for people who already have H-1B status. USCIS reports country of birth, not citizenship. These counts come from USCIS, not from the DOL filings on the rest of this site, so they do not link to an employer.";

/** Each year's share for one place, or null if any year has no count for it. */
function yearlyShares(years: BirthCountryYear[], place: BirthCountryRow) {
  const shares = years.flatMap((y) => {
    const count = place.approved[y.fiscal_year];
    return count == null ? [] : [count / y.approved];
  });
  return shares.length === years.length ? shares : null;
}

/** The numbers the copy states, or null when the data is missing or covers one year only. */
function summarize(years: BirthCountryYear[], countries: BirthCountryRow[]) {
  const [lead, second] = countries;
  if (years.length < 2 || !lead || !second) return null;
  const leadShares = yearlyShares(years, lead);
  const secondShares = yearlyShares(years, second);
  if (!leadShares || !secondShares) return null;
  const topTwo = leadShares.map((share, i) => share + secondShares[i]);
  return {
    first: years[0],
    latest: years[years.length - 1],
    lead,
    second,
    leadFirst: leadShares[0],
    leadLatest: leadShares[leadShares.length - 1],
    secondLatest: secondShares[secondShares.length - 1],
    topTwoMin: Math.min(...topTwo),
    topTwoMax: Math.max(...topTwo),
  };
}

/** Home page section: approved H-1B petitions by beneficiary country of birth, by fiscal year. */
export default function BirthCountrySection({
  years,
  countries,
}: {
  years: BirthCountryYear[];
  countries: BirthCountryRow[];
}) {
  const summary = summarize(years, countries);
  if (!summary) return null;
  const { first, latest, lead, second, leadFirst, leadLatest, secondLatest, topTwoMin, topTwoMax } = summary;
  const span = `FY${first.fiscal_year} to FY${latest.fiscal_year}`;

  return (
    <section className="space-y-6" aria-labelledby="birth-country-title">
      <h2 className="type-heading" id="birth-country-title">
        Approved H-1B petitions by country of birth
      </h2>
      <div className="type-body max-w-3xl space-y-4 text-neutral-primary">
        <p>
          In FY{latest.fiscal_year}, USCIS approved {fmtInt(latest.approved)} H-1B petitions. Workers born in{" "}
          {lead.country} got <span className="font-semibold">{fmtPct(leadLatest, 1)}</span> of them. Workers
          born in {second.country} got {fmtPct(secondLatest, 1)}.
        </p>
        <p>
          From {span}, these two countries got between {fmtPct(topTwoMin, 1)} and {fmtPct(topTwoMax, 1)} of
          approvals each year. The share for {lead.country} {leadLatest < leadFirst ? "fell" : "rose"} from{" "}
          {fmtPct(leadFirst, 1)} to {fmtPct(leadLatest, 1)}.
        </p>
      </div>
      <BirthCountryBars years={years} countries={countries} />
      <BirthCountryTable years={years} countries={countries} />
      <aside className="type-small max-w-3xl space-y-1 rounded-lg bg-neutral-secondary px-5 py-4 text-neutral-primary">
        <strong className="font-semibold">What this can’t tell us</strong>
        <p>{LIMITS}</p>
      </aside>
      <p className="type-meta">
        Source:{" "}
        <a href={USCIS_REPORTS_URL} className="link">
          USCIS, Characteristics of H-1B Specialty Occupation Workers
        </a>
        , reports to Congress for {span} (Table 4a; Table 1a for FY2025).{" "}
        <a href={`${REPO_URL}/blob/main/docs/country-of-birth-method.md`} className="link">
          Method
        </a>
        .
      </p>
    </section>
  );
}
