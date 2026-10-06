import { supabase } from "./supabase";

/** Latest complete LCA fiscal year; the /cheap-labor page reports on it. */
export const CHEAP_LABOR_FY = 2025;

/** DOL prevailing-wage level floors as local-wage percentiles (DOL NPRM, 91 FR, Mar 27 2026). */
export const WAGE_LEVEL_PERCENTILES = { I: 17, II: 34, III: 50, IV: 67 } as const;

export const WAGE_LEVEL_SOURCE_URL =
  "https://www.federalregister.gov/documents/2026/03/27/2026-06017/improving-wage-protections-for-the-temporary-and-permanent-employment-of-certain-foreign-nationals";

export type DependencyProfile = {
  dependency: "true" | "false" | "unknown";
  filings: number;
  wage_level_known: number;
  wage_level_1: number;
  wage_level_2: number;
  wage_level_3: number;
  wage_level_4: number;
  yearly_with_floor: number;
  paid_at_floor: number;
  median_wage: number | null;
};

/** Per-dependency rows for one fiscal year (lca_dependency_profile materialized view). */
export async function getDependencyProfile(fy = CHEAP_LABOR_FY) {
  const { data } = await supabase
    .from("lca_dependency_profile")
    .select(
      "dependency, filings, wage_level_known, wage_level_1, wage_level_2, wage_level_3, wage_level_4, yearly_with_floor, paid_at_floor, median_wage",
    )
    .eq("fiscal_year", fy);
  return (data ?? []) as DependencyProfile[];
}

/** Sum the wage-level counts across dependency rows. */
export function totalWageLevels(rows: DependencyProfile[]) {
  const sum = (key: keyof DependencyProfile) =>
    rows.reduce((total, r) => total + (Number(r[key]) || 0), 0);
  return {
    known: sum("wage_level_known"),
    levels: [
      { level: "I", count: sum("wage_level_1") },
      { level: "II", count: sum("wage_level_2") },
      { level: "III", count: sum("wage_level_3") },
      { level: "IV", count: sum("wage_level_4") },
    ] as const,
  };
}

export type MarketGapSummary = {
  dependency: "all" | "true" | "false" | "unknown";
  filings_certified: number;
  filings_eligible: number;
  filings_matched: number;
  below_median: number;
  median_gap: number;
  median_gap_below: number | null;
};

export type EmployerMarketGap = {
  employer_id: number;
  filings_matched: number;
  below_median: number;
  median_gap: number;
  employers?: { name: string } | null;
};

/** Below this many matched filings, an employer's below-median share is too noisy to rank. */
export const MIN_RANKED_FILINGS = 500;

/** Offered pay vs. local median, per dependency group (market_gap_summary). */
export async function getMarketGapSummary(fy = CHEAP_LABOR_FY) {
  const { data } = await supabase
    .from("market_gap_summary")
    .select("dependency, filings_certified, filings_eligible, filings_matched, below_median, median_gap, median_gap_below")
    .eq("lca_fiscal_year", fy);
  return (data ?? []) as MarketGapSummary[];
}

/** Large sponsors ranked by the share of filings that offer less than the local median. */
export async function getBelowMedianLeaders(fy = CHEAP_LABOR_FY, limit = 15) {
  const { data } = await supabase
    .from("employer_market_gap")
    .select("employer_id, filings_matched, below_median, median_gap, employers(name)")
    .eq("lca_fiscal_year", fy)
    .gte("filings_matched", MIN_RANKED_FILINGS);
  const rows: EmployerMarketGap[] = (data ?? []).map((r) => ({
    ...r,
    // PostgREST returns the many-to-one embed as an object; supabase-js types it as an array.
    employers: Array.isArray(r.employers) ? (r.employers[0] ?? null) : r.employers,
  }));
  return rows
    .sort((a, b) => b.below_median / b.filings_matched - a.below_median / a.filings_matched)
    .slice(0, limit);
}

/** One employer's offered pay vs. local median, or null when it has no matched filings. */
export async function getEmployerMarketGap(employerId: number, fy = CHEAP_LABOR_FY) {
  const { data } = await supabase
    .from("employer_market_gap")
    .select("employer_id, filings_matched, below_median, median_gap")
    .eq("lca_fiscal_year", fy)
    .eq("employer_id", employerId)
    .maybeSingle();
  return data as EmployerMarketGap | null;
}

export type PwSource = "dol_determination" | "oews" | "survey" | "union" | "federal_contract" | "other";

export type PwSourceSummary = {
  source: PwSource;
  filings: number;
  gap_matched: number;
  below_median: number;
};

export type PwSurveyPublisher = {
  publisher: string;
  filings: number;
  gap_matched: number;
  below_median: number;
};

/** Wage-floor source totals across all employers (pw_source_summary, dependency = 'all'). */
export async function getPwSourceSummary(fy = CHEAP_LABOR_FY) {
  const { data } = await supabase
    .from("pw_source_summary")
    .select("source, filings, gap_matched, below_median")
    .eq("lca_fiscal_year", fy)
    .eq("dependency", "all")
    .order("filings", { ascending: false });
  return (data ?? []) as PwSourceSummary[];
}

/** Private survey publishers with the most filings. */
export async function getPwSurveyPublishers(fy = CHEAP_LABOR_FY, limit = 8) {
  const { data } = await supabase
    .from("pw_survey_publishers")
    .select("publisher, filings, gap_matched, below_median")
    .eq("lca_fiscal_year", fy)
    .order("filings", { ascending: false })
    .limit(limit);
  return (data ?? []) as PwSurveyPublisher[];
}

export type WhdYear = {
  fiscal_year: number;
  cases: number;
  back_wages: number;
  employees: number;
  penalties: number;
};

export type WhdTopEmployer = {
  name_key: string;
  name: string;
  state: string | null;
  employer_id: number | null;
  cases: number;
  back_wages: number;
  employees: number;
};

export type EmployerWhd = {
  cases: number;
  back_wages: number;
  employees: number;
  penalties: number;
  latest_fiscal_year: number | null;
};

/** H-1B enforcement by fiscal year of findings (whd_h1b_years), oldest first. */
export async function getWhdYears() {
  const { data } = await supabase
    .from("whd_h1b_years")
    .select("fiscal_year, cases, back_wages, employees, penalties")
    .order("fiscal_year");
  return (data ?? []) as WhdYear[];
}

/** Employers with the most H-1B back wages, as named in the WHD record. */
export async function getWhdTopEmployers(limit = 10) {
  const { data } = await supabase
    .from("whd_h1b_top_employers")
    .select("name_key, name, state, employer_id, cases, back_wages, employees")
    .order("back_wages", { ascending: false })
    .limit(limit);
  return (data ?? []) as WhdTopEmployer[];
}

/** One employer's linked WHD H-1B cases, or null when none link to it. */
export async function getEmployerWhd(employerId: number) {
  const { data } = await supabase
    .from("employer_whd_h1b")
    .select("cases, back_wages, employees, penalties, latest_fiscal_year")
    .eq("employer_id", employerId)
    .maybeSingle();
  return data as EmployerWhd | null;
}

/** Sum the yearly enforcement rows into all-time totals. */
export function totalWhd(years: WhdYear[]) {
  return years.reduce(
    (t, y) => ({
      cases: t.cases + y.cases,
      back_wages: t.back_wages + Number(y.back_wages),
      employees: t.employees + y.employees,
      penalties: t.penalties + Number(y.penalties),
    }),
    { cases: 0, back_wages: 0, employees: 0, penalties: 0 },
  );
}
