-- H1B Bench schema: DOL OFLC LCA disclosure data (H-1B / H-1B1 / E-3)
-- Live DB history: initial_h1b_bench_schema -> drop_bulk_insert_policies -> fy_overview_view
-- -> search_functions -> search_employers_popularity_ranking -> employer_headcounts
-- -> drop_headcount_insert_policy -> labor_pool -> drop_labor_pool_insert_policies -> labor_pool_fillable_view
-- -> lca_dependency_profile -> lca_dependency_profile_yearly_floor -> lca_dependency_profile_exact_floor
-- -> market_gap -> drop_market_gap_insert_policies -> pw_source -> drop_pw_source_insert_policies
-- -> whd_h1b -> drop_whd_h1b_insert_policies.
-- pg_trgm lives in the extensions schema; anon bulk-insert policies are dropped after load.

create schema if not exists extensions;
create extension if not exists pg_trgm schema extensions;

create table employers (
  id bigint generated always as identity primary key,
  name text not null,                    -- canonical display name (most frequent filing variant)
  name_normalized text not null unique,  -- uppercase, punctuation-collapsed
  fein text,
  city text,
  state text,
  postal_code text,
  country text,
  naics_code integer
);

create table lca_cases (
  case_number text primary key,
  employer_id bigint not null references employers(id),
  visa_class text not null,              -- H-1B, H-1B1, E-3
  case_status text not null,             -- Certified / Denied / Withdrawn / Certified - Withdrawn
  received_date date,
  decision_date date,
  original_cert_date date,
  begin_date date,
  end_date date,
  job_title text,
  soc_code text,
  soc_title text,
  full_time_position boolean,
  total_worker_positions integer,
  new_employment integer,
  continued_employment integer,
  change_previous_employment integer,
  new_concurrent_employment integer,
  change_employer integer,
  amended_petition integer,
  employer_name_raw text,                -- as filed on this case
  worksite_city text,
  worksite_county text,
  worksite_state text,
  worksite_postal_code text,
  wage_rate_of_pay_from numeric,
  wage_rate_of_pay_to numeric,
  wage_unit_of_pay text,
  wage_from_annual numeric,              -- normalized to annual dollars
  wage_to_annual numeric,
  prevailing_wage numeric,
  pw_wage_level text,
  total_worksite_locations integer,
  h1b_dependent boolean,
  willful_violator boolean,
  lawfirm_name text,
  fiscal_year smallint not null,         -- DOL fiscal year of the source file
  file_quarter smallint not null
);

create index lca_cases_employer_idx on lca_cases (employer_id);
create index lca_cases_fy_idx on lca_cases (fiscal_year);
create index lca_cases_status_idx on lca_cases (case_status);
create index lca_cases_visa_idx on lca_cases (visa_class);
create index lca_cases_soc_idx on lca_cases (soc_code);
create index lca_cases_worksite_state_idx on lca_cases (worksite_state);
create index lca_cases_job_title_trgm on lca_cases using gin (job_title gin_trgm_ops);
create index employers_name_trgm on employers using gin (name gin_trgm_ops);

-- Per-employer per-year rollup powering the leaderboard
create table employer_year_stats (
  employer_id bigint not null references employers(id),
  fiscal_year smallint not null,
  visa_class text not null,
  filings integer not null,
  certified integer not null,
  denied integer not null,
  withdrawn integer not null,
  certified_withdrawn integer not null,
  worker_positions integer,
  certified_worker_positions integer,
  median_wage_annual numeric,
  avg_wage_annual numeric,
  median_prevailing_wage numeric,
  top_job_title text,
  top_soc_code text,
  top_worksite_state text,
  primary key (employer_id, fiscal_year, visa_class)
);

-- Job-title rollup for the occupation benchmark pages
create table job_title_year_stats (
  soc_code text not null,
  soc_title text,
  fiscal_year smallint not null,
  filings integer not null,
  certified integer not null,
  median_wage_annual numeric,
  avg_wage_annual numeric,
  distinct_employers integer,
  primary key (soc_code, fiscal_year)
);

-- PERM-reported total headcount per employer (Form ETA-9089 EMP_NUM_PAYROLL), loaded by
-- etl/load_headcounts.py. Powers the "% of workforce" column.
create table employer_headcounts (
  employer_id bigint primary key references employers(id),
  employee_count integer not null check (employee_count > 0), -- most frequently reported value
  agreeing_filings integer not null,     -- PERM filings that reported exactly employee_count
  perm_filings integer not null,         -- PERM filings with a headcount for this employer
  latest_received date,                  -- newest PERM filing used
  match_method text not null check (match_method in ('fein', 'name'))
);

-- Domestic labor pool vs. H-1B new-employment demand (docs/labor-pool-method.md),
-- loaded by etl/labor_pool.py --load.
create table labor_pool (
  lca_fiscal_year smallint not null,
  acs_year smallint not null,
  occ_code text not null,                -- 2018 Census occupation code as used in ACS PUMS (OCCP)
  state text not null,                   -- 2-letter state, or 'US' for national
  occ_title text,
  filings integer not null,              -- certified H-1B LCA filings
  new_positions integer not null,        -- certified H-1B new-employment positions (demand)
  supply_est integer not null,           -- unemployed, bachelor's+, last job in this occupation
  supply_moe integer not null,           -- 90% margin of error (replicate weights)
  supply_recent_est integer not null,    -- same, last worked within 12 months
  supply_recent_moe integer not null,
  covered boolean not null,              -- supply_est - supply_moe >= new_positions
  covered_recent boolean not null,
  primary key (lca_fiscal_year, occ_code, state)
);

create table labor_pool_summary (
  lca_fiscal_year smallint not null,
  acs_year smallint not null,
  tier text not null check (tier in ('national', 'recent', 'same_state')),
  filings_covered integer not null,
  filings_total integer not null,
  primary key (lca_fiscal_year, tier)
);

-- H-1B offered pay vs. local median pay (docs/market-gap-method.md), loaded by
-- etl/market_gap.py --load. Local median = OFLC wage library Level III (50th percentile).
create table market_gap_summary (
  lca_fiscal_year smallint not null,
  dependency text not null check (dependency in ('all', 'true', 'false', 'unknown')),
  filings_certified integer not null,
  filings_eligible integer not null,     -- yearly-unit, full-time, offered pay > 0
  filings_matched integer not null,      -- also matched to an area and a Level III wage
  below_median integer not null,
  median_gap integer not null,           -- median of offered pay - local median, dollars
  median_gap_below integer,              -- same, among filings below the median
  primary key (lca_fiscal_year, dependency)
);

create table employer_market_gap (
  lca_fiscal_year smallint not null,
  employer_id bigint not null references employers(id),
  filings_matched integer not null,
  below_median integer not null,
  median_gap integer not null,
  primary key (lca_fiscal_year, employer_id)
);

-- Who set the H-1B wage floor (docs/pw-source-method.md), loaded by etl/pw_source.py --load.
create table pw_source_summary (
  lca_fiscal_year smallint not null,
  source text not null check (source in ('dol_determination', 'oews', 'survey', 'union', 'federal_contract', 'other')),
  dependency text not null check (dependency in ('all', 'true', 'false', 'unknown')),
  filings integer not null,
  wage_level_known integer not null,
  level_1_2 integer not null,
  gap_matched integer not null,          -- filings matched in the market-gap method
  below_median integer not null,         -- of those, offered pay < local median
  primary key (lca_fiscal_year, source, dependency)
);

create table pw_survey_publishers (
  lca_fiscal_year smallint not null,
  publisher text not null,               -- grouped by firm name (etl/pw_source.py)
  filings integer not null,
  dependent_filings integer not null,
  gap_matched integer not null,
  below_median integer not null,
  primary key (lca_fiscal_year, publisher)
);

-- H-1B back wages from DOL WHD enforcement (docs/back-wages-method.md), loaded by
-- etl/back_wages.py --load. Amounts are back wages employers agreed to pay.
create table whd_h1b_years (
  fiscal_year smallint primary key,      -- federal FY of FINDINGS_END_DATE
  cases integer not null,
  back_wages bigint not null,
  employees integer not null,
  penalties bigint not null
);

create table whd_h1b_top_employers (
  name_key text primary key,             -- normalized WHD legal (or trade) name
  name text not null,                    -- as in the WHD record
  state text,
  employer_id bigint references employers(id),  -- exact normalized-name link, if any
  cases integer not null,
  back_wages bigint not null,
  employees integer not null,
  penalties bigint not null
);

create table employer_whd_h1b (
  employer_id bigint primary key references employers(id),
  cases integer not null,
  back_wages bigint not null,
  employees integer not null,
  penalties bigint not null,
  latest_fiscal_year smallint
);

-- RLS: read-only public data
alter table employers enable row level security;
alter table lca_cases enable row level security;
alter table employer_year_stats enable row level security;
alter table job_title_year_stats enable row level security;
alter table employer_headcounts enable row level security;
alter table labor_pool enable row level security;
alter table labor_pool_summary enable row level security;
alter table market_gap_summary enable row level security;
alter table employer_market_gap enable row level security;
alter table pw_source_summary enable row level security;
alter table pw_survey_publishers enable row level security;
alter table whd_h1b_years enable row level security;
alter table whd_h1b_top_employers enable row level security;
alter table employer_whd_h1b enable row level security;

create policy "public read employers" on employers for select using (true);
create policy "public read lca_cases" on lca_cases for select using (true);
create policy "public read employer_year_stats" on employer_year_stats for select using (true);
create policy "public read job_title_year_stats" on job_title_year_stats for select using (true);
create policy "public read employer_headcounts" on employer_headcounts for select using (true);
create policy "public read labor_pool" on labor_pool for select using (true);
create policy "public read labor_pool_summary" on labor_pool_summary for select using (true);
create policy "public read market_gap_summary" on market_gap_summary for select using (true);
create policy "public read employer_market_gap" on employer_market_gap for select using (true);
create policy "public read pw_source_summary" on pw_source_summary for select using (true);
create policy "public read pw_survey_publishers" on pw_survey_publishers for select using (true);
create policy "public read whd_h1b_years" on whd_h1b_years for select using (true);
create policy "public read whd_h1b_top_employers" on whd_h1b_top_employers for select using (true);
create policy "public read employer_whd_h1b" on employer_whd_h1b for select using (true);

-- Loader role policies: allow anon insert during bulk load. Dropped after the initial
-- load (migration drop_bulk_insert_policies); re-create before any quarterly refresh:
--
--   create policy "bulk insert employers" on employers for insert with check (true);
--   create policy "bulk insert lca_cases" on lca_cases for insert with check (true);
--   create policy "bulk insert employer_year_stats" on employer_year_stats for insert with check (true);
--   create policy "bulk insert job_title_year_stats" on job_title_year_stats for insert with check (true);
--   create policy "bulk insert employer_headcounts" on employer_headcounts for insert with check (true);
--   create policy "bulk insert labor_pool" on labor_pool for insert with check (true);
--   create policy "bulk insert labor_pool_summary" on labor_pool_summary for insert with check (true);
--   create policy "bulk insert market_gap_summary" on market_gap_summary for insert with check (true);
--   create policy "bulk insert employer_market_gap" on employer_market_gap for insert with check (true);
--   create policy "bulk insert pw_source_summary" on pw_source_summary for insert with check (true);
--   create policy "bulk insert pw_survey_publishers" on pw_survey_publishers for insert with check (true);
--   create policy "bulk insert whd_h1b_years" on whd_h1b_years for insert with check (true);
--   create policy "bulk insert whd_h1b_top_employers" on whd_h1b_top_employers for insert with check (true);
--   create policy "bulk insert employer_whd_h1b" on employer_whd_h1b for insert with check (true);

-- Server-side per-year overview (avoids PostgREST's 1000-row response cap in the app)
create view fy_overview with (security_invoker = true) as
select
  fiscal_year,
  sum(filings)::bigint as filings,
  sum(certified)::bigint as certified,
  sum(denied)::bigint as denied,
  sum(worker_positions)::bigint as worker_positions
from employer_year_stats
group by fiscal_year
order by fiscal_year;

-- Per-year profile of certified H-1B LCAs: skill level, new hires, occupation concentration.
-- Refresh after each LCA load: refresh materialized view concurrently lca_year_profile;
create materialized view lca_year_profile as
with c as (
  select fiscal_year, left(soc_code, 7) as soc, pw_wage_level,
         coalesce(new_employment, 0) as ne, coalesce(total_worker_positions, 0) as pos
  from lca_cases
  where visa_class = 'H-1B' and case_status = 'Certified'
),
soc_rank as (
  select fiscal_year, count(*) as n,
         row_number() over (partition by fiscal_year order by count(*) desc) as rk
  from c group by fiscal_year, soc
),
top20 as (
  select fiscal_year, sum(n)::int as top20_occupation_filings
  from soc_rank where rk <= 20 group by fiscal_year
)
select c.fiscal_year,
       count(*)::int as certified_filings,
       count(*) filter (where pw_wage_level is not null)::int as wage_level_known,
       count(*) filter (where pw_wage_level in ('I', 'II'))::int as wage_level_1_2,
       count(*) filter (where pw_wage_level = 'I')::int as wage_level_1,
       count(*) filter (where ne > 0)::int as new_employment_filings,
       sum(ne)::int as new_employment_positions,
       sum(pos)::int as worker_positions,
       max(t.top20_occupation_filings) as top20_occupation_filings
from c join top20 t using (fiscal_year)
group by c.fiscal_year;

create unique index lca_year_profile_fy on lca_year_profile (fiscal_year);
grant select on lca_year_profile to anon, authenticated;

-- Measure 2 (defined after Measure 1 results were seen; see docs/labor-pool-results.md):
-- new H-1B positions the unemployed alone could fill = sum over occupations of
-- least(supply lower bound, new positions).
create view labor_pool_fillable with (security_invoker = true) as
select lca_fiscal_year, 'national'::text as tier,
       sum(new_positions)::int as positions_total,
       sum(least(greatest(supply_est - supply_moe, 0), new_positions))::int as positions_fillable
from labor_pool where state = 'US' group by lca_fiscal_year
union all
select lca_fiscal_year, 'recent',
       sum(new_positions)::int,
       sum(least(greatest(supply_recent_est - supply_recent_moe, 0), new_positions))::int
from labor_pool where state = 'US' group by lca_fiscal_year
union all
select lca_fiscal_year, 'same_state',
       sum(new_positions)::int,
       sum(least(greatest(supply_est - supply_moe, 0), new_positions))::int
from labor_pool where state <> 'US' group by lca_fiscal_year;

grant select on labor_pool_fillable to anon, authenticated;

-- Certified H-1B LCAs per fiscal year, split by DOL "H-1B dependent" status: wage level mix,
-- offers exactly at the prevailing-wage floor, and offered pay. lca_cases has no prevailing-wage unit, so
-- only yearly-scale floors (>= $15,000) are compared against yearly offered pay.
-- Refresh after each LCA load: refresh materialized view concurrently lca_dependency_profile;
create materialized view lca_dependency_profile as
select fiscal_year,
       coalesce(h1b_dependent::text, 'unknown') as dependency,
       count(*)::int as filings,
       count(*) filter (where pw_wage_level is not null)::int as wage_level_known,
       count(*) filter (where pw_wage_level = 'I')::int as wage_level_1,
       count(*) filter (where pw_wage_level = 'II')::int as wage_level_2,
       count(*) filter (where pw_wage_level = 'III')::int as wage_level_3,
       count(*) filter (where pw_wage_level = 'IV')::int as wage_level_4,
       count(*) filter (where wage_unit_of_pay ilike 'year%' and prevailing_wage >= 15000)::int as yearly_with_floor,
       count(*) filter (where wage_unit_of_pay ilike 'year%' and prevailing_wage >= 15000
                          and wage_rate_of_pay_from = prevailing_wage)::int as paid_at_floor,
       percentile_cont(0.5) within group (order by wage_from_annual)::int as median_wage
from lca_cases
where visa_class = 'H-1B' and case_status = 'Certified'
group by fiscal_year, coalesce(h1b_dependent::text, 'unknown');

create unique index lca_dependency_profile_key on lca_dependency_profile (fiscal_year, dependency);
grant select on lca_dependency_profile to anon, authenticated;
