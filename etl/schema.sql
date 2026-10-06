-- H1B Bench schema: DOL OFLC LCA disclosure data (H-1B / H-1B1 / E-3)
-- Live DB history: initial_h1b_bench_schema -> drop_bulk_insert_policies -> fy_overview_view.
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

-- RLS: read-only public data
alter table employers enable row level security;
alter table lca_cases enable row level security;
alter table employer_year_stats enable row level security;
alter table job_title_year_stats enable row level security;

create policy "public read employers" on employers for select using (true);
create policy "public read lca_cases" on lca_cases for select using (true);
create policy "public read employer_year_stats" on employer_year_stats for select using (true);
create policy "public read job_title_year_stats" on job_title_year_stats for select using (true);

-- Loader role policies: allow anon insert during bulk load. Dropped after the initial
-- load (migration drop_bulk_insert_policies); re-create before any quarterly refresh:
--
--   create policy "bulk insert employers" on employers for insert with check (true);
--   create policy "bulk insert lca_cases" on lca_cases for insert with check (true);
--   create policy "bulk insert employer_year_stats" on employer_year_stats for insert with check (true);
--   create policy "bulk insert job_title_year_stats" on job_title_year_stats for insert with check (true);

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
