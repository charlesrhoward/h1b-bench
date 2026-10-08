/**
 * Types and constants for the /explore page. Client components import this module, so it
 * must not import the Supabase client.
 */

/** Fiscal year of every explorer view: the newest year with complete LCA, market-gap, and labor-pool data. */
export const EXPLORE_FY = 2025;
/** Employers below this many FY2025 H-1B LCA filings are left out of the company views. */
export const EXPLORE_MIN_FILINGS = 25;
/** Below this many matched filings, an employer's share below the local median is not shown. */
export const MIN_GAP_FILINGS = 10;
/** ACS PUMS (the U.S. person file) does not cover these territories, so they have no unemployed count. */
export const NO_ACS_STATES = new Set(["GU", "MP", "PR", "VI"]);

/** One employer with at least EXPLORE_MIN_FILINGS H-1B LCAs in EXPLORE_FY. Missing values stay null. */
export type ExploreEmployer = {
  id: number;
  name: string;
  topState: string | null;
  topSoc: string | null;
  topJob: string | null;
  filings: number;
  certified: number;
  workers: number | null;
  medianWage: number | null;
  /** Certified LCAs ÷ PERM-reported headcount, in percent. Null when the headcount is missing or doubtful. */
  workforcePct: number | null;
  gapMatched: number | null;
  /** Share of matched filings that offer less than the local median, in percent (null below MIN_GAP_FILINGS). */
  belowMedianPct: number | null;
  medianGap: number | null;
  backWages: number | null;
  whdCases: number | null;
  /** Workers in WARN notices that new-worker H-1B filings followed within 12 months (notices Oct 2020 to Jun 2025). */
  laidOff: number | null;
  warnStates: string | null;
  /** Certified new-worker H-1B LCAs received 1 to 365 days after those notices. */
  filingsAfterLayoff: number | null;
};

/** One occupation group in one state (or "US"): H-1B demand against unemployed workers with that job history. */
export type ExploreLaborCell = {
  occ: string;
  state: string;
  filings: number;
  positions: number;
  /** Unemployed, bachelor's degree or higher, last job in this occupation. Null where ACS has no data. */
  supply: number | null;
  moe: number | null;
  covered: boolean;
};

export type ExploreData = {
  employers: ExploreEmployer[];
  cells: ExploreLaborCell[];
  occupations: Record<string, string>;
  acsYear: number;
};

/**
 * Rows as one key list plus value tuples. Repeating every key on every row made the page
 * payload about four times larger.
 */
export type Packed<T> = { keys: (keyof T & string)[]; rows: unknown[][] };

/** ExploreData as the server sends it to the browser. */
export type ExploreWire = Omit<ExploreData, "employers" | "cells"> & {
  employers: Packed<ExploreEmployer>;
  cells: Packed<ExploreLaborCell>;
};

/** Packs rows that all have the same keys as `first`. */
export function pack<T extends object>(items: T[]): Packed<T> {
  const keys = (items.length ? Object.keys(items[0]) : []) as (keyof T & string)[];
  return { keys, rows: items.map((item) => keys.map((key) => item[key])) };
}

/** Rebuilds the rows that pack() flattened. The tuples came from T, so the result is T. */
export function unpack<T>({ keys, rows }: Packed<T>): T[] {
  return rows.map((row) => Object.fromEntries(keys.map((key, i) => [key, row[i]])) as T);
}

/** One year of one employer's H-1B filings, for the comparison chart. */
export type EmployerHistoryRow = {
  employer_id: number;
  fiscal_year: number;
  filings: number;
  certified: number;
  median_wage_annual: number | null;
};
