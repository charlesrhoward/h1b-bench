import { supabase } from "./supabase";
import {
  EXPLORE_FY,
  EXPLORE_MIN_FILINGS,
  MIN_GAP_FILINGS,
  NO_ACS_STATES,
  pack,
  type EmployerHistoryRow,
  type ExploreWire,
  type ExploreEmployer,
  type ExploreLaborCell,
} from "./explore-model";
import { headcountDoubt, type Headcount } from "./workforce";

const PAGE_SIZE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Reads every row of a query, PAGE_SIZE at a time (the API caps each response at 1,000 rows). */
async function fetchAll<T>(label: string, page: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

type MarketGapRow = { filings_matched: number; below_median: number; median_gap: number };

type EmployerRow = {
  employer_id: number;
  filings: number;
  certified: number;
  worker_positions: number | null;
  median_wage_annual: number | null;
  top_soc_code: string | null;
  top_job_title: string | null;
  top_worksite_state: string | null;
  employers: {
    name: string;
    state: string | null;
    employer_headcounts: Headcount | null;
    employer_whd_h1b: { back_wages: number; cases: number } | null;
    employer_market_gap: MarketGapRow[];
    employer_layoff_filings: { workers_laid_off: number; states: string; filings_after: number } | null;
  } | null;
};

const EMPLOYER_SELECT = `employer_id, filings, certified, worker_positions, median_wage_annual,
  top_soc_code, top_job_title, top_worksite_state,
  employers(name, state,
    employer_headcounts(employee_count, agreeing_filings, perm_filings, latest_received, match_method),
    employer_whd_h1b(back_wages, cases),
    employer_market_gap(filings_matched, below_median, median_gap),
    employer_layoff_filings(workers_laid_off, states, filings_after))`;

/** Certified LCAs as a percent of the PERM headcount, only when that headcount is trustworthy and the share is at most 100%. */
function reliableWorkforcePct(certified: number, hc: Headcount | null): number | null {
  if (!hc || headcountDoubt(hc)) return null;
  const pct = (certified / hc.employee_count) * 100;
  return pct <= 100 ? round2(pct) : null;
}

/** Two decimals: enough for any percent the page shows, and a smaller payload. */
const round2 = (n: number) => Math.round(n * 100) / 100;

/** The employer's market gap, or undefined when too few filings matched a local median. */
function usableGap(gap: MarketGapRow | undefined): MarketGapRow | undefined {
  return gap && gap.filings_matched >= MIN_GAP_FILINGS ? gap : undefined;
}

type EmployerFacts = NonNullable<EmployerRow["employers"]>;

/** Pay against the local median, from the employer's market-gap row. */
function gapFacts(gaps: MarketGapRow[] | undefined) {
  const matched = gaps?.[0];
  const gap = usableGap(matched);
  return {
    gapMatched: matched?.filings_matched ?? null,
    belowMedianPct: gap ? round2((gap.below_median / gap.filings_matched) * 100) : null,
    medianGap: gap?.median_gap ?? null,
  };
}

/** H-1B back wages from WHD cases, all years. */
function whdFacts(whd: EmployerFacts["employer_whd_h1b"] | undefined) {
  // A case with $0 in back wages is a closed case, not money owed, so it is not flagged.
  if (!whd || Number(whd.back_wages) <= 0) return { backWages: null, whdCases: null };
  return { backWages: Number(whd.back_wages), whdCases: whd.cases };
}

/** WARN notices (Oct 2020 to Jun 2025) that new-worker H-1B filings followed within 12 months (docs/layoff-filings-method.md). */
function layoffFacts(layoffs: EmployerFacts["employer_layoff_filings"] | undefined) {
  if (!layoffs) return { laidOff: null, warnStates: null, filingsAfterLayoff: null };
  return {
    laidOff: layoffs.workers_laid_off,
    warnStates: layoffs.states.replaceAll(",", ", "),
    filingsAfterLayoff: layoffs.filings_after,
  };
}

/** Name, home state, and the PERM-based workforce share. */
function profileFacts(row: EmployerRow) {
  const e = row.employers;
  return {
    name: e?.name ?? `Employer ${row.employer_id}`,
    hqState: e?.state ?? null,
    workforcePct: reliableWorkforcePct(row.certified, e?.employer_headcounts ?? null),
  };
}

function toExploreEmployer(row: EmployerRow): ExploreEmployer {
  const e = row.employers;
  return {
    id: Number(row.employer_id),
    ...profileFacts(row),
    topState: row.top_worksite_state,
    topSoc: row.top_soc_code,
    topJob: row.top_job_title,
    filings: row.filings,
    certified: row.certified,
    workers: row.worker_positions,
    medianWage: row.median_wage_annual == null ? null : Number(row.median_wage_annual),
    ...gapFacts(e?.employer_market_gap),
    ...whdFacts(e?.employer_whd_h1b),
    ...layoffFacts(e?.employer_layoff_filings),
  };
}

/** Employers with at least EXPLORE_MIN_FILINGS H-1B LCAs in EXPLORE_FY, with pay, market gap, headcount, WHD, and layoff facts. */
async function getExploreEmployers(): Promise<ExploreEmployer[]> {
  const rows = await fetchAll<EmployerRow>("explore employers", (from, to) =>
    supabase
      .from("employer_year_stats")
      .select(EMPLOYER_SELECT)
      .eq("visa_class", "H-1B")
      .eq("fiscal_year", EXPLORE_FY)
      .gte("filings", EXPLORE_MIN_FILINGS)
      .eq("employers.employer_market_gap.lca_fiscal_year", EXPLORE_FY)
      .order("employer_id")
      .range(from, to)
      .overrideTypes<EmployerRow[], { merge: false }>(),
  );
  return rows.map(toExploreEmployer);
}

type LaborPoolRow = {
  occ_code: string;
  occ_title: string | null;
  state: string;
  filings: number;
  new_positions: number;
  supply_est: number;
  supply_moe: number;
  covered: boolean;
  acs_year: number;
};

/** Every labor-pool cell for EXPLORE_FY (national and per state), plus occupation titles. */
async function getExploreLaborPool() {
  const rows = await fetchAll<LaborPoolRow>("explore labor pool", (from, to) =>
    supabase
      .from("labor_pool")
      .select("occ_code, occ_title, state, filings, new_positions, supply_est, supply_moe, covered, acs_year")
      .eq("lca_fiscal_year", EXPLORE_FY)
      .order("state")
      .order("occ_code")
      .range(from, to),
  );
  const occupations: Record<string, string> = {};
  const cells = rows.map((r): ExploreLaborCell => {
    occupations[r.occ_code] = r.occ_title ?? `Census occupation ${r.occ_code}`;
    const noSurvey = NO_ACS_STATES.has(r.state);
    return {
      occ: r.occ_code,
      state: r.state,
      filings: r.filings,
      positions: r.new_positions,
      supply: noSurvey ? null : r.supply_est,
      moe: noSurvey ? null : r.supply_moe,
      covered: r.covered,
    };
  });
  return { cells, occupations, acsYear: rows[0]?.acs_year ?? 0 };
}

/** Everything the /explore page needs, read in parallel and packed for the browser. */
export async function getExploreData(): Promise<ExploreWire> {
  const [employers, labor] = await Promise.all([getExploreEmployers(), getExploreLaborPool()]);
  return { ...labor, employers: pack(employers), cells: pack(labor.cells) };
}

/** H-1B filings by fiscal year for up to a few employers (the comparison chart). */
export async function getEmployerHistory(ids: number[]): Promise<EmployerHistoryRow[]> {
  const { data, error } = await supabase
    .from("employer_year_stats")
    .select("employer_id, fiscal_year, filings, certified, median_wage_annual")
    .eq("visa_class", "H-1B")
    .in("employer_id", ids)
    .order("fiscal_year");
  if (error) throw new Error(`employer history: ${error.message}`);
  return (data ?? []).map((r) => ({
    ...r,
    employer_id: Number(r.employer_id),
    median_wage_annual: r.median_wage_annual == null ? null : Number(r.median_wage_annual),
  }));
}
