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
