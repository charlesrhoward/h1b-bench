import { supabase } from "./supabase";

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
  employers?: { name: string; state: string | null } | null;
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
    .select("*, employers(name, state)")
    .eq("visa_class", "H-1B")
    .order("filings", { ascending: false })
    .limit(limit);
  if (year) q = q.eq("fiscal_year", year);
  else q = q.eq("fiscal_year", 2025);
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

export async function getEmployer(id: number) {
  const { data } = await supabase.from("employers").select("*").eq("id", id).single();
  return data as Employer | null;
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

export async function getJobStats(year = 2025, limit = 50) {
  const { data } = await supabase
    .from("job_title_year_stats")
    .select("*")
    .eq("fiscal_year", year)
    .order("filings", { ascending: false })
    .limit(limit);
  return (data ?? []) as JobYearStat[];
}
