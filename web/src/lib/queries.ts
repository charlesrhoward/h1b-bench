import { cache } from "react";
import { supabase } from "./supabase";
import type { Headcount } from "./workforce";

export type EmployerYearStat = {
  employer_id: number;
  fiscal_year: number;
  visa_class: string;
  filings: number;
  certified: number;
  denied: number;
  withdrawn: number;
  certified_withdrawn: number;
  worker_positions: number | null;
  certified_worker_positions: number | null;
  median_wage_annual: number | null;
  avg_wage_annual: number | null;
  median_prevailing_wage: number | null;
  top_job_title: string | null;
  top_soc_code: string | null;
  top_worksite_state: string | null;
  employers?: {
    name: string;
    state: string | null;
    employer_headcounts?: Headcount | null;
  } | null;
};

export type Employer = {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  naics_code: number | null;
};

export type JobYearStat = {
  soc_code: string;
  soc_title: string | null;
  fiscal_year: number;
  filings: number;
  certified: number;
  median_wage_annual: number | null;
  avg_wage_annual: number | null;
  distinct_employers: number | null;
};

const HEADCOUNT_COLUMNS = "employee_count, agreeing_filings, perm_filings, latest_received, match_method";

export async function getOverviewStats() {
  const { data: yearRows } = await supabase
    .from("fy_overview")
    .select("fiscal_year, filings, certified")
    .order("fiscal_year");

  const years = (yearRows ?? []).map((r) => [
    r.fiscal_year,
    { filings: Number(r.filings), certified: Number(r.certified) },
  ]) as [number, { filings: number; certified: number }][];
  const totalFilings = years.reduce((s, [, v]) => s + v.filings, 0);
  const totalCertified = years.reduce((s, [, v]) => s + v.certified, 0);

  const { count: employerCount } = await supabase
    .from("employers")
    .select("id", { count: "exact", head: true });

  return { years, totalFilings, totalCertified, employerCount: employerCount ?? 0 };
}

export async function getTopEmployers(year?: number, limit = 50) {
  let q = supabase
    .from("employer_year_stats")
    .select(`*, employers(name, state, employer_headcounts(${HEADCOUNT_COLUMNS}))`)
    .eq("visa_class", "H-1B")
    .order("filings", { ascending: false })
    .limit(limit);
  if (year) q = q.eq("fiscal_year", year);
  else q = q.eq("fiscal_year", 2026);
  const { data } = await q;
  return (data ?? []) as EmployerYearStat[];
}

export async function searchEmployers(term: string, limit = 25) {
  const { data } = await supabase
    .from("employers")
    .select("id, name, city, state, country")
    .ilike("name", `%${term}%`)
    .order("name")
    .limit(limit);
  return (data ?? []) as Employer[];
}

export type EmployerHit = {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  filings: number;
};

export async function searchEmployerHits(term: string, limit = 100) {
  const { data } = await supabase.rpc("search_employers", { q: term, lim: limit });
  return (data ?? []) as EmployerHit[];
}

/** One employer by id. Cached per request: the page and its metadata both call it. */
export const getEmployer = cache(async (id: number) => {
  const { data } = await supabase.from("employers").select("*").eq("id", id).single();
  return data as Employer | null;
});

export async function getEmployerHeadcount(id: number) {
  const { data } = await supabase
    .from("employer_headcounts")
    .select(HEADCOUNT_COLUMNS)
    .eq("employer_id", id)
    .maybeSingle();
  return data as Headcount | null;
}

export async function getEmployerStats(id: number) {
  const { data } = await supabase
    .from("employer_year_stats")
    .select("*")
    .eq("employer_id", id)
    .order("fiscal_year")
    .order("visa_class");
  return (data ?? []) as EmployerYearStat[];
}

export async function getEmployerTopJobs(id: number, limit = 15) {
  const { data } = await supabase
    .from("lca_cases")
    .select("job_title, soc_code, wage_from_annual, case_status")
    .eq("employer_id", id)
    .eq("case_status", "Certified")
    .not("wage_from_annual", "is", null)
    .order("decision_date", { ascending: false })
    .limit(1000);
  if (!data) return [];
  const byTitle = new Map<string, { count: number; wages: number[]; soc: string | null }>();
  for (const r of data) {
    const t = (r.job_title ?? "Unknown").trim();
    const cur = byTitle.get(t) ?? { count: 0, wages: [] as number[], soc: r.soc_code as string | null };
    cur.count += 1;
    if (r.wage_from_annual) cur.wages.push(Number(r.wage_from_annual));
    byTitle.set(t, cur);
  }
  return [...byTitle.entries()]
    .map(([title, v]) => ({
      title,
      soc: v.soc,
      count: v.count,
      medianWage: v.wages.length ? v.wages.sort((a, b) => a - b)[Math.floor(v.wages.length / 2)] : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getJobStats(year = 2026, limit = 50, q?: string) {
  let query = supabase
    .from("job_title_year_stats")
    .select("*")
    .eq("fiscal_year", year)
    .order("filings", { ascending: false })
    .limit(q ? 100 : limit);
  if (q) {
    const safe = q.replace(/[(),."\\]/g, " ").trim();
    if (safe) query = query.or(`soc_title.ilike.%${safe}%,soc_code.ilike.${safe}%`);
  }
  const { data } = await query;
  return (data ?? []) as JobYearStat[];
}

/** Rows per request; the API returns at most 1,000 rows at a time. */
const SITEMAP_PAGE_SIZE = 1000;

/**
 * Employers with at least `minFilings` H-1B LCAs in one fiscal year, for sitemap.xml.
 * Small filers are left out so the sitemap lists pages with enough data to be useful.
 */
export async function getSitemapEmployerIds(fiscalYear: number, minFilings: number) {
  const ids: number[] = [];
  for (let from = 0; ; from += SITEMAP_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("employer_year_stats")
      .select("employer_id")
      .eq("visa_class", "H-1B")
      .eq("fiscal_year", fiscalYear)
      .gte("filings", minFilings)
      .order("employer_id")
      .range(from, from + SITEMAP_PAGE_SIZE - 1);
    if (error) throw new Error(`sitemap employers: ${error.message}`);
    ids.push(...data.map((row) => Number(row.employer_id)));
    if (data.length < SITEMAP_PAGE_SIZE) return ids;
  }
}

/** USCIS approvals per fiscal year, from the "Characteristics of H-1B" reports. */
export type BirthCountryYear = { fiscal_year: number; approved: number };

/** Approved petitions for one place of birth, by fiscal year. */
export type BirthCountryRow = { country: string; approved: Record<number, number> };

/**
 * Approved H-1B petitions by beneficiary country of birth (docs/country-of-birth-method.md):
 * the yearly totals, and every year's count for the `limit` leading places in the latest year.
 */
export async function getBirthCountryShares(limit = 6) {
  const [{ data: yearRows }, { data: leaderRows }] = await Promise.all([
    supabase.from("uscis_birth_country_years").select("fiscal_year, approved").order("fiscal_year"),
    supabase
      .from("uscis_birth_country")
      .select("country")
      .neq("country", "Unknown")
      .order("fiscal_year", { ascending: false })
      .order("approved", { ascending: false })
      .limit(limit),
  ]);
  const years = (yearRows ?? []) as BirthCountryYear[];
  const leaders = ((leaderRows ?? []) as { country: string }[]).map((r) => r.country);
  if (years.length === 0 || leaders.length === 0) return { years, countries: [] };

  const { data } = await supabase
    .from("uscis_birth_country")
    .select("fiscal_year, country, approved")
    .in("country", leaders);
  const rows = (data ?? []) as { fiscal_year: number; country: string; approved: number }[];
  return { years, countries: groupByCountry(leaders, rows) };
}

/** One row per place, in `order`, with its count for each fiscal year it appears in. */
function groupByCountry(order: string[], rows: { fiscal_year: number; country: string; approved: number }[]) {
  const byCountry = new Map<string, Record<number, number>>(order.map((c) => [c, {}]));
  for (const row of rows) {
    const counts = byCountry.get(row.country);
    if (counts) counts[row.fiscal_year] = row.approved;
  }
  return order.map((country): BirthCountryRow => ({ country, approved: byCountry.get(country) ?? {} }));
}
