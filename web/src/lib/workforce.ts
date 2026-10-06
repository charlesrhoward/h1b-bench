import { fmtInt } from "./format";

/** PERM-reported headcount for one employer (table employer_headcounts). */
export type Headcount = {
  employee_count: number;
  agreeing_filings: number;
  perm_filings: number;
  latest_received: string | null;
  match_method: "fein" | "name";
};

export type WorkforceShare = {
  label: string;
  /** False when the share is missing, over 100%, or based on a disputed or unconfirmed headcount. */
  reliable: boolean;
  title: string;
};

/** Below this share of PERM filings agreeing on one headcount, the number is treated as disputed. */
const MIN_AGREEMENT = 0.25;
/** A headcount reported on a single filing is unconfirmed. */
const MIN_AGREEING_FILINGS = 2;

export const WORKFORCE_SHARE_METHOD =
  "Certified H-1B LCAs in the fiscal year ÷ the employer's total headcount as reported on its PERM green card filings (FY2025–FY2026). Approximate: an LCA is not a visa, and headcounts are self-reported.";

/** Why a headcount is not trustworthy, or null when enough PERM filings agree on it. */
export function headcountDoubt(hc: Headcount): string | null {
  if (hc.agreeing_filings < MIN_AGREEING_FILINGS) return "Unconfirmed headcount";
  if (hc.agreeing_filings / hc.perm_filings < MIN_AGREEMENT) return "Disputed headcount";
  return null;
}

/** One-line provenance for a headcount, e.g. "77,400 employees · reported on 2,697 of 4,842 PERM filings". */
export function describeHeadcount(hc: Headcount): string {
  const filings = hc.perm_filings === 1 ? "1 PERM filing" : `${fmtInt(hc.perm_filings)} PERM filings`;
  return `${fmtInt(hc.employee_count)} employees · reported on ${fmtInt(hc.agreeing_filings)} of ${filings}`;
}

/** Certified H-1B LCAs as a share of the employer's PERM-reported headcount. */
export function workforceShare(certified: number, hc: Headcount | null | undefined): WorkforceShare {
  if (!hc) {
    return { label: "—", reliable: false, title: "No PERM headcount on file for this employer" };
  }
  const pct = (certified / hc.employee_count) * 100;
  const provenance = describeHeadcount(hc);
  if (pct > 100) {
    return {
      label: ">100%",
      reliable: false,
      title: `More LCAs than reported employees (${provenance}). The headcount likely covers one entity, not the whole company.`,
    };
  }
  const doubt = headcountDoubt(hc);
  if (doubt) {
    return { label: `${pct.toFixed(1)}%`, reliable: false, title: `${doubt}: ${provenance}` };
  }
  return { label: `${pct.toFixed(1)}%`, reliable: true, title: provenance };
}
