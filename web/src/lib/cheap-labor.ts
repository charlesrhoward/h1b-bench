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
    .eq("fiscal_year", fy).throwOnError();
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
    .eq("lca_fiscal_year", fy).throwOnError();
  return (data ?? []) as MarketGapSummary[];
}

/** Large sponsors ranked by the share of filings that offer less than the local median. */
export async function getBelowMedianLeaders(fy = CHEAP_LABOR_FY, limit = 15) {
  const { data } = await supabase
    .from("employer_market_gap")
    .select("employer_id, filings_matched, below_median, median_gap, employers(name)")
    .eq("lca_fiscal_year", fy)
    .gte("filings_matched", MIN_RANKED_FILINGS).throwOnError();
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
    .maybeSingle().throwOnError();
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
    .order("filings", { ascending: false }).throwOnError();
  return (data ?? []) as PwSourceSummary[];
}

/** Private survey publishers with the most filings. */
export async function getPwSurveyPublishers(fy = CHEAP_LABOR_FY, limit = 8) {
  const { data } = await supabase
    .from("pw_survey_publishers")
    .select("publisher, filings, gap_matched, below_median")
    .eq("lca_fiscal_year", fy)
    .order("filings", { ascending: false })
    .limit(limit).throwOnError();
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
    .order("fiscal_year").throwOnError();
  return (data ?? []) as WhdYear[];
}

/** Employers with the most H-1B back wages, as named in the WHD record. */
export async function getWhdTopEmployers(limit = 10) {
  const { data } = await supabase
    .from("whd_h1b_top_employers")
    .select("name_key, name, state, employer_id, cases, back_wages, employees")
    .order("back_wages", { ascending: false })
    .limit(limit).throwOnError();
  return (data ?? []) as WhdTopEmployer[];
}

/** One employer's linked WHD H-1B cases, or null when none link to it. */
export async function getEmployerWhd(employerId: number) {
  const { data } = await supabase
    .from("employer_whd_h1b")
    .select("cases, back_wages, employees, penalties, latest_fiscal_year")
    .eq("employer_id", employerId)
    .maybeSingle().throwOnError();
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

/**
 * Method measure 7: the counted filings split into new employment and change of employer, and the
 * certified filings in the same windows that the count leaves out (extensions and amendments).
 */
export type LayoffFilingsBreakdown = {
  filings_after_new_employment: number;
  filings_after_change_employer: number;
  filings_after_not_counted: number;
};

export type LayoffFilingsSummary = LayoffFilingsBreakdown & {
  notice_start: string;
  notice_end: string;
  states: number;
  notices_in_window: number;
  notices_matched: number;
  notices_followed: number;
  notices_followed_90: number;
  companies_followed: number;
  workers_laid_off: number;
  filings_after: number;
  positions_after: number;
  filings_before: number;
  filings_after_same_state: number;
};

export type LayoffFilingsCompany = LayoffFilingsBreakdown & {
  key: string;
  company: string;
  states: string;
  notices_followed: number;
  workers_laid_off: number;
  first_notice: string;
  filings_after: number;
  positions_after: number;
  filings_after_90: number;
  filings_before: number;
  employer_id: number | null;
};

export type EmployerLayoffFilings = LayoffFilingsBreakdown & {
  notices_followed: number;
  workers_laid_off: number;
  states: string;
  filings_after: number;
  positions_after: number;
  filings_before: number;
};

/** WARN notices followed by new-worker H-1B filings (docs/layoff-filings-method.md), or null when not loaded. */
export async function getLayoffFilingsSummary() {
  const { data } = await supabase
    .from("layoff_filings_summary")
    .select(
      "notice_start, notice_end, states, notices_in_window, notices_matched, notices_followed, notices_followed_90, companies_followed, workers_laid_off, filings_after, positions_after, filings_before, filings_after_same_state, filings_after_new_employment, filings_after_change_employer, filings_after_not_counted",
    )
    .order("notice_start", { ascending: false })
    .limit(1)
    .maybeSingle().throwOnError();
  return data as LayoffFilingsSummary | null;
}

/** The companies with the most workers in WARN notices that new-worker H-1B filings followed. */
export async function getLayoffFilingsCompanies() {
  const { data } = await supabase
    .from("layoff_filings_companies")
    .select(
      "key, company, states, notices_followed, workers_laid_off, first_notice, filings_after, positions_after, filings_after_90, filings_before, employer_id, filings_after_new_employment, filings_after_change_employer, filings_after_not_counted",
    )
    .order("workers_laid_off", { ascending: false }).throwOnError();
  return (data ?? []) as LayoffFilingsCompany[];
}

/** One employer's company-level layoff-then-filings totals, or null when none matched. */
export async function getEmployerLayoffFilings(employerId: number) {
  const { data } = await supabase
    .from("employer_layoff_filings")
    .select(
      "notices_followed, workers_laid_off, states, filings_after, positions_after, filings_before, filings_after_new_employment, filings_after_change_employer, filings_after_not_counted",
    )
    .eq("employer_id", employerId)
    .maybeSingle().throwOnError();
  return data as EmployerLayoffFilings | null;
}

/** Method measure 8: one WARN notice on an employer's timeline, with counted filings around it. */
export type LayoffNotice = {
  notice_date: string;
  state: string;
  company: string;
  location: string | null;
  workers: number | null;
  followed: boolean;
  filings_after: number;
  filings_before: number;
};

/** Method measure 8: certified H-1B filings received in one month, split as in measure 7. */
export type LayoffMonth = {
  month: string;
  new_employment: number;
  change_employer: number;
  not_counted: number;
};

export type EmployerLayoffTimeline = { notices: LayoffNotice[]; months: LayoffMonth[] };

/** One employer's layoff timeline (company-level rows), or null when it has none. */
export async function getEmployerLayoffTimeline(employerId: number): Promise<EmployerLayoffTimeline | null> {
  const [notices, months] = await Promise.all([
    supabase
      .from("employer_layoff_notices")
      .select("notice_date, state, company, location, workers, followed, filings_after, filings_before")
      .eq("employer_id", employerId)
      .order("notice_date"),
    supabase
      .from("employer_layoff_months")
      .select("month, new_employment, change_employer, not_counted")
      .eq("employer_id", employerId)
      .order("month"),
  ]);
  if (notices.error || months.error) console.error("layoff timeline:", (notices.error ?? months.error)?.message);
  if (!notices.data?.length) return null;
  return { notices: notices.data as LayoffNotice[], months: (months.data ?? []) as LayoffMonth[] };
}

export type UscisRegistrationYear = {
  cap_fiscal_year: number;
  total_registrations: number;
  eligible_registrations: number;
  eligible_single: number;
  eligible_multiple: number;
  selected_registrations: number;
};

/** First cap year in which USCIS selected by person, not by registration. */
export const BENEFICIARY_CENTRIC_FROM = 2025;

/** USCIS H-1B cap registration counts per cap fiscal year, oldest first. */
export async function getUscisRegistrations() {
  const { data } = await supabase
    .from("uscis_registrations")
    .select(
      "cap_fiscal_year, total_registrations, eligible_registrations, eligible_single, eligible_multiple, selected_registrations",
    )
    .order("cap_fiscal_year").throwOnError();
  return (data ?? []) as UscisRegistrationYear[];
}

/** PERM disclosure year used by the green card section. */
export const PERM_FY = 2025;

export type PermLockinSummary = {
  certified: number;
  fw_working: number;
  professional_certified: number;
  professional_fw_working: number;
  layoff_certified: number;
  layoff_employers: number;
  median_days: number;
  p90_days: number;
};

export type PermLayoffEmployer = {
  name_key: string;
  name: string;
  employer_id: number | null;
  certified: number;
  layoff_certified: number;
};

export type EmployerPerm = {
  certified: number;
  fw_working: number;
  layoff_certified: number;
};

/** Certified PERM filings: worker already employed, prior layoffs, DOL wait; null when not loaded. */
export async function getPermLockinSummary() {
  const { data } = await supabase
    .from("perm_lockin_summary")
    .select(
      "certified, fw_working, professional_certified, professional_fw_working, layoff_certified, layoff_employers, median_days, p90_days",
    )
    .eq("perm_fiscal_year", PERM_FY)
    .maybeSingle().throwOnError();
  return data as PermLockinSummary | null;
}

/** Employers with the most certified PERM filings after a reported layoff. */
export async function getPermLayoffEmployers() {
  const { data } = await supabase
    .from("perm_layoff_employers")
    .select("name_key, name, employer_id, certified, layoff_certified")
    .eq("perm_fiscal_year", PERM_FY)
    .order("layoff_certified", { ascending: false }).throwOnError();
  return (data ?? []) as PermLayoffEmployer[];
}

/** One employer's certified PERM filings for the year, or null when none link to it. */
export async function getEmployerPerm(employerId: number) {
  const { data } = await supabase
    .from("employer_perm")
    .select("certified, fw_working, layoff_certified")
    .eq("perm_fiscal_year", PERM_FY)
    .eq("employer_id", employerId)
    .maybeSingle().throwOnError();
  return data as EmployerPerm | null;
}
