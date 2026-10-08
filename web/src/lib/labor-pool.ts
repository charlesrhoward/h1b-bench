import { supabase } from "./supabase";

/** LCA fiscal year the labor pool test ran against (see docs/labor-pool-method.md). */
export const LABOR_POOL_FY = 2025;

export type LaborPoolTier = "national" | "recent" | "same_state";

export type LaborPoolSummary = {
  tier: LaborPoolTier;
  acs_year: number;
  filings_covered: number;
  filings_total: number;
};

export type LaborPoolOccupation = {
  occ_code: string;
  occ_title: string | null;
  filings: number;
  new_positions: number;
  supply_est: number;
  supply_moe: number;
  covered: boolean;
  covered_recent: boolean;
};

export type LcaYearProfile = {
  fiscal_year: number;
  certified_filings: number;
  wage_level_known: number;
  wage_level_1_2: number;
  wage_level_1: number;
  new_employment_filings: number;
  new_employment_positions: number;
  worker_positions: number;
  top20_occupation_filings: number;
};

/** Headline coverage per tier, in tier order (national, recent, same state). */
export async function getLaborPoolSummary(fy = LABOR_POOL_FY) {
  const { data } = await supabase
    .from("labor_pool_summary")
    .select("tier, acs_year, filings_covered, filings_total")
    .eq("lca_fiscal_year", fy).throwOnError();
  const order: LaborPoolTier[] = ["national", "recent", "same_state"];
  return ((data ?? []) as LaborPoolSummary[]).sort(
    (a, b) => order.indexOf(a.tier) - order.indexOf(b.tier),
  );
}

/** National rows for the occupation groups with the most H-1B filings. */
export async function getLaborPoolOccupations(fy = LABOR_POOL_FY, limit = 20) {
  const { data } = await supabase
    .from("labor_pool")
    .select("occ_code, occ_title, filings, new_positions, supply_est, supply_moe, covered, covered_recent")
    .eq("lca_fiscal_year", fy)
    .eq("state", "US")
    .order("filings", { ascending: false })
    .limit(limit).throwOnError();
  return (data ?? []) as LaborPoolOccupation[];
}

/** Counts of national occupation groups that pass and fail the rule. */
export async function getLaborPoolGroupCounts(fy = LABOR_POOL_FY) {
  const base = () =>
    supabase
      .from("labor_pool")
      .select("occ_code", { count: "exact", head: true })
      .eq("lca_fiscal_year", fy)
      .eq("state", "US");
  const [all, covered] = await Promise.all([base().throwOnError(), base().eq("covered", true).throwOnError()]);
  return { total: all.count ?? 0, covered: covered.count ?? 0 };
}

export async function getLcaYearProfile(fy = LABOR_POOL_FY) {
  const { data } = await supabase
    .from("lca_year_profile")
    .select("*")
    .eq("fiscal_year", fy)
    .maybeSingle().throwOnError();
  return data as LcaYearProfile | null;
}

export type LaborPoolFillable = {
  tier: LaborPoolTier;
  positions_total: number;
  positions_fillable: number;
};

/** Measure 2: new H-1B positions the unemployed alone could fill, per tier (labor_pool_fillable view). */
export async function getLaborPoolFillable(fy = LABOR_POOL_FY) {
  const { data } = await supabase
    .from("labor_pool_fillable")
    .select("tier, positions_total, positions_fillable")
    .eq("lca_fiscal_year", fy).throwOnError();
  const order: LaborPoolTier[] = ["national", "recent", "same_state"];
  return ((data ?? []) as LaborPoolFillable[]).sort(
    (a, b) => order.indexOf(a.tier) - order.indexOf(b.tier),
  );
}

/** Positions in one occupation the unemployed alone could fill: the supply lower bound, capped at demand. */
export function fillablePositions(row: LaborPoolOccupation): number {
  return Math.min(Math.max(row.supply_est - row.supply_moe, 0), row.new_positions);
}
