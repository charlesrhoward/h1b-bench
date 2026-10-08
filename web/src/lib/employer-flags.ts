import { supabase } from "./supabase";
import { CHEAP_LABOR_FY, type EmployerLayoffFilings, type EmployerMarketGap } from "./cheap-labor";

/** Rules from docs/employer-flags-method.md. Change the method before you change a value. */
export const UNDERPAID_MIN_FILINGS = 25;
export const UNDERPAID_MIN_SHARE = 2 / 3;

export const FLAGS_METHOD_PATH = "docs/employer-flags-method.md";

/** One employer's flags. A null flag means the employer does not meet that rule. */
export type EmployerFlags = {
  underpaid: EmployerMarketGap | null;
  layoffs: EmployerLayoffFilings | null;
};

/**
 * True when the employer meets the "Underpaid" rule: enough matched filings, more than
 * two thirds of them below the local median, and a median gap below $0.
 */
export function isUnderpaid(gap: EmployerMarketGap | null): gap is EmployerMarketGap {
  if (!gap || gap.filings_matched < UNDERPAID_MIN_FILINGS) return false;
  if (gap.median_gap >= 0) return false;
  return gap.below_median / gap.filings_matched > UNDERPAID_MIN_SHARE;
}

/** Flags for one employer page, from rows the page already fetched. */
export function employerFlags(gap: EmployerMarketGap | null, layoffs: EmployerLayoffFilings | null): EmployerFlags {
  return { underpaid: isUnderpaid(gap) ? gap : null, layoffs };
}

export function hasFlags(flags: EmployerFlags | undefined): flags is EmployerFlags {
  return Boolean(flags && (flags.underpaid || flags.layoffs));
}

type LayoffRow = EmployerLayoffFilings & { employer_id: number };

/** FY rows that can meet the "Underpaid" rule, for the given employers. */
async function fetchUnderpaid(ids: number[]): Promise<EmployerMarketGap[]> {
  const { data } = await supabase
    .from("employer_market_gap")
    .select("employer_id, filings_matched, below_median, median_gap")
    .eq("lca_fiscal_year", CHEAP_LABOR_FY)
    .gte("filings_matched", UNDERPAID_MIN_FILINGS)
    .lt("median_gap", 0)
    .in("employer_id", ids).throwOnError();
  return ((data ?? []) as EmployerMarketGap[]).filter(isUnderpaid);
}

/** Layoff-then-filings rows for the given employers. */
async function fetchLayoffs(ids: number[]): Promise<LayoffRow[]> {
  const { data } = await supabase
    .from("employer_layoff_filings")
    .select(
      "employer_id, notices_followed, workers_laid_off, states, filings_after, positions_after, filings_before, filings_after_new_employment, filings_after_change_employer, filings_after_not_counted",
    )
    .in("employer_id", ids).throwOnError();
  return (data ?? []) as LayoffRow[];
}

/** Flags for a list of employers (leaderboard, search), keyed by employer id. Employers without a flag are left out. */
export async function getEmployerFlags(ids: number[]): Promise<Map<number, EmployerFlags>> {
  const flags = new Map<number, EmployerFlags>();
  if (ids.length === 0) return flags;
  const [underpaid, layoffs] = await Promise.all([fetchUnderpaid(ids), fetchLayoffs(ids)]);
  const entry = (id: number) => flags.get(id) ?? { underpaid: null, layoffs: null };
  for (const gap of underpaid) flags.set(gap.employer_id, { ...entry(gap.employer_id), underpaid: gap });
  for (const row of layoffs) flags.set(row.employer_id, { ...entry(row.employer_id), layoffs: row });
  return flags;
}
