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
