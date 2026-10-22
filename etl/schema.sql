-- H1B Bench schema: DOL OFLC LCA disclosure data (H-1B / H-1B1 / E-3)
-- Live DB history: initial_h1b_bench_schema -> drop_bulk_insert_policies -> fy_overview_view
-- -> search_functions -> search_employers_popularity_ranking -> employer_headcounts
-- -> drop_headcount_insert_policy -> labor_pool -> drop_labor_pool_insert_policies -> labor_pool_fillable_view
-- -> lca_dependency_profile -> lca_dependency_profile_yearly_floor -> lca_dependency_profile_exact_floor
-- -> market_gap -> drop_market_gap_insert_policies -> pw_source -> drop_pw_source_insert_policies
-- -> whd_h1b -> drop_whd_h1b_insert_policies -> warn_h1b -> drop_warn_h1b_insert_policies
-- -> uscis_registrations -> perm_lockin -> drop_perm_lockin_insert_policies
-- -> market_gap_annual_wage_reload (truncate market_gap_summary, employer_market_gap,
--    pw_source_summary, pw_survey_publishers + temporary insert policies; reload after the
--    yearly-wage fix in docs/market-gap-method.md) -> drop_market_gap_reload_insert_policies
-- -> layoff_filings -> drop_layoff_filings_insert_policies -> uscis_birth_country
-- -> drop_uscis_birth_country_insert_policies -> employer_tickers (sec_companies,
--    employer_tickers + temporary insert policies) -> drop_employer_tickers_insert_policies
-- -> employer_parents (sec_subsidiary_exhibits, sec_subsidiaries, employer_parents + temporary
--    insert policies, incl. sec_companies) -> drop_employer_parents_insert_policies
-- -> layoff_filings_breakdown (truncate layoff_filings_summary, layoff_filings_companies,
--    employer_layoff_filings; add filings_after_new_employment, filings_after_change_employer,
--    filings_after_not_counted; temporary insert policies; reload, docs/layoff-filings-method.md
--    measure 7) -> drop_layoff_filings_breakdown_insert_policies
-- -> lca_cases_employer_recent_certified_idx (2026-10-08: approved concurrent covering
--    index for recent certified roles; no data, normalization, or materialized-view reload)
-- -> layoff_timeline (create employer_layoff_notices, employer_layoff_months + public read and
--    temporary insert policies; layoff_filings.py --load-timeline, docs/layoff-filings-method.md
--    measure 8) -> drop_layoff_timeline_insert_policies
-- -> search_employers_short_terms (2026-10-16: employers_name_lower_prefix, built concurrently
--    first; drop employers_name_trgm_idx, which search_functions created as a copy of
--    employers_name_trgm: gin (name gin_trgm_ops); search_employers escapes LIKE wildcards and
--    matches 1-2 letter terms by name prefix; no data, normalization, or materialized-view reload)
-- -> explicit_data_api_grants (20261022181311, applied 2026-10-22: 120 existing grants;
--    verified zero permission, RLS, policy, ownership, view, default or routine changes).
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
-- Applied concurrently in production on 2026-10-08. Run outside a transaction.
create index concurrently lca_cases_employer_recent_certified_idx
on lca_cases (employer_id, decision_date desc)
include (job_title, soc_code, wage_from_annual)
where case_status = 'Certified' and wage_from_annual is not null;
create index lca_cases_fy_idx on lca_cases (fiscal_year);
create index lca_cases_status_idx on lca_cases (case_status);
create index lca_cases_visa_idx on lca_cases (visa_class);
create index lca_cases_soc_idx on lca_cases (soc_code);
create index lca_cases_worksite_state_idx on lca_cases (worksite_state);
create index lca_cases_job_title_trgm on lca_cases using gin (job_title gin_trgm_ops);
create index employers_name_trgm on employers using gin (name gin_trgm_ops);
-- 1-2 letter search terms (search_employers); build concurrently on a live database.
create index employers_name_lower_prefix on employers (lower(name) text_pattern_ops);

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

-- WARN layoff notices from employers with certified H-1B filings (docs/warn-method.md),
-- loaded by etl/warn.py --load. Texas: full FY window; California: Oct 2024 to Jun 2025.
create table warn_h1b_summary (
  lca_fiscal_year smallint primary key,
  notices_in_window integer not null,
  companies_matched integer not null,
  notices_matched integer not null,
  workers_laid_off integer not null,
  h1b_filings integer not null           -- matched companies' certified H-1B filings
);

create table warn_h1b_companies (
  lca_fiscal_year smallint not null,
  key text not null,                     -- company key (etl/warn.py company_key)
  company text not null,                 -- as named in the WARN notice
  states text not null,
  notices integer not null,
  workers_laid_off integer not null,
  h1b_filings integer not null,
  employer_id bigint references employers(id),  -- name variant with the most filings
  primary key (lca_fiscal_year, key)
);

create table employer_warn (
  lca_fiscal_year smallint not null,
  employer_id bigint not null references employers(id),
  notices integer not null,              -- totals for the employer's whole company key
  workers_laid_off integer not null,
  states text not null,
  primary key (lca_fiscal_year, employer_id)
);

-- WARN notices (48-state compilation) followed within 365 days by certified H-1B LCAs for
-- workers new to the company (docs/layoff-filings-method.md), loaded by
-- etl/layoff_filings.py --load. One summary row per run of the method.
create table layoff_filings_summary (
  notice_start date primary key,
  notice_end date not null,
  follow_days smallint not null,
  warn_revision text not null,             -- Hugging Face dataset revision used
  states smallint not null,
  notices_in_window integer not null,
  notices_matched integer not null,
  notices_followed integer not null,
  notices_followed_90 integer not null,
  companies_followed integer not null,
  workers_laid_off integer not null,       -- workers in notices that were followed
  filings_after integer not null,          -- new-worker LCAs received 1-365 days after a notice
  positions_after integer not null,
  filings_before integer not null,         -- new-worker LCAs received 1-365 days before a notice
  filings_after_same_state integer not null,
  filings_after_new_employment integer not null,   -- measure 7: counted, NEW_EMPLOYMENT >= 1
  filings_after_change_employer integer not null,  -- measure 7: counted, transfers only
  filings_after_not_counted integer not null       -- measure 7: extensions/amendments/concurrent, same windows
);

create table layoff_filings_companies (
  key text primary key,                    -- company key (etl/warn.py company_key)
  company text not null,                   -- as named in the WARN notices
  states text not null,
  notices_followed integer not null,
  workers_laid_off integer not null,
  first_notice date not null,
  filings_after integer not null,
  positions_after integer not null,
  filings_after_90 integer not null,
  filings_before integer not null,
  employer_id bigint references employers(id),  -- name variant with the most counted filings
  filings_after_new_employment integer not null,   -- measure 7
  filings_after_change_employer integer not null,
  filings_after_not_counted integer not null
);

create table employer_layoff_filings (
  employer_id bigint primary key references employers(id),
  notices_followed integer not null,       -- totals for the employer's whole company key
  workers_laid_off integer not null,
  states text not null,
  filings_after integer not null,
  positions_after integer not null,
  filings_before integer not null,
  filings_after_new_employment integer not null,   -- measure 7
  filings_after_change_employer integer not null,
  filings_after_not_counted integer not null
);

-- Timeline on employer pages (docs/layoff-filings-method.md, measure 8). Each company's rows
-- are copied to every employer name variant with its company key, like employer_layoff_filings.
create table employer_layoff_notices (
  id bigint generated always as identity primary key,
  employer_id bigint not null references employers(id),
  notice_date date not null,
  state text not null,
  company text not null,                 -- company name as written in the notice
  location text,                         -- site as written in the notice; free text
  workers integer,                       -- null when the notice does not give a number
  followed boolean not null,             -- measure 2: a counted filing 1 to 365 days after
  filings_after integer not null,        -- counted filings 1 to 365 days after this notice
  filings_before integer not null        -- counted filings 1 to 365 days before this notice
);
create index employer_layoff_notices_employer on employer_layoff_notices (employer_id, notice_date);

create table employer_layoff_months (
  employer_id bigint not null references employers(id),
  month date not null,                   -- first day of the month received; Oct 2019 to May 2026
  new_employment integer not null,       -- measure 7 split, all certified H-1B filings that month
  change_employer integer not null,
  not_counted integer not null,
  primary key (employer_id, month)
);

-- USCIS H-1B cap registration Historical Data table (docs/lottery-method.md), copied by
-- hand from the USCIS "H-1B Electronic Registration Process" page, updated 09/21/2026.
create table uscis_registrations (
  cap_fiscal_year smallint primary key,
  total_registrations integer not null,
  eligible_registrations integer not null,
  eligible_single integer not null,      -- people with no other eligible registration
  eligible_multiple integer not null,    -- people with multiple eligible registrations
  selected_registrations integer not null
);

insert into uscis_registrations values
  (2021, 274237, 269424, 241299, 28125, 124415),
  (2022, 308613, 301447, 211304, 90143, 131924),
  (2023, 483927, 474421, 309241, 165180, 127600),
  (2024, 780884, 758994, 350103, 408891, 188400),
  (2025, 479953, 470342, 423028, 47314, 135137),
  (2026, 358737, 343981, 336153, 7828, 120141);

-- Approved H-1B petitions by beneficiary country of birth (docs/country-of-birth-method.md),
-- loaded by etl/country_of_birth.py --load from the USCIS "Characteristics of H-1B
-- Specialty Occupation Workers" reports (Table 4a FY2020-FY2024, Table 1a FY2025).
create table uscis_birth_country_years (
  fiscal_year smallint primary key,      -- federal FY of the approval
  approved integer not null,             -- sum of every country row, "Unknown" included
  countries smallint not null            -- rows in the table, "Unknown" included
);

create table uscis_birth_country (
  fiscal_year smallint not null references uscis_birth_country_years(fiscal_year),
  country text not null,                 -- place of birth as USCIS labels it, one spelling
  approved integer not null,
  primary key (fiscal_year, country)
);

-- SEC companies looked up by etl/tickers.py: the EIN from EDGAR submissions per CIK, stored so
-- later runs only ask the SEC about new CIKs. A null EIN means the SEC lists none.
create table sec_companies (
  cik integer primary key,               -- SEC Central Index Key
  ein text check (ein ~ '^[0-9]{9}$'),
  sec_name text not null,                -- company name as in company_tickers.json
  fetched_at timestamptz not null default now()
);

-- Subsidiary list of each public parent's latest annual report (docs/employer-parents-method.md):
-- 10-K Exhibit 21 or 20-F Exhibit 8, read by etl/parents.py. Stored so reruns only ask the SEC
-- about newer reports.
create table sec_subsidiary_exhibits (
  cik integer primary key,               -- SEC Central Index Key of the parent
  accession text not null,               -- annual report accession number
  filed date not null,
  form text not null check (form in ('10-K', '20-F')),
  url text                               -- the exhibit; null when the report has none
);

create table sec_subsidiaries (
  cik integer not null references sec_subsidiary_exhibits(cik),
  name text not null,                    -- one text cell of the exhibit (names, jurisdictions, headings)
  primary key (cik, name)
);

-- Employers that are subsidiaries of a public company, loaded by etl/parents.py --load.
create table employer_parents (
  employer_id bigint primary key references employers(id),
  parent_cik integer not null,
  parent_ticker text not null,
  parent_name text not null,             -- company name as in company_tickers.json
  relation text not null check (relation in ('subsidiary', 'same_company')),  -- same_company: FEIN = parent EIN
  filed date not null,                   -- date of the annual report whose exhibit lists the employer
  source_url text not null               -- that exhibit
);
create index employer_parents_ticker on employer_parents (parent_ticker);

-- Stock tickers for employer page URLs (docs/employer-tickers-method.md), loaded by
-- etl/tickers.py --load. Name match confirmed by FEIN = SEC EIN; one row per employer and ticker.
create table employer_tickers (
  employer_id bigint primary key references employers(id),
  ticker text not null unique check (ticker ~ '^[A-Z][A-Z.-]{0,9}$'),
  cik integer not null,                  -- SEC Central Index Key
  sec_name text not null                 -- company name as in company_tickers.json
);

-- PERM green card filings: job already filled, prior layoffs, DOL wait
-- (docs/perm-lockin-method.md), loaded by etl/perm_lockin.py --load. Certified only.
create table perm_lockin_summary (
  perm_fiscal_year smallint primary key,
  certified integer not null,
  fw_working integer not null,           -- worker already employed by the employer
  professional_certified integer not null,
  professional_fw_working integer not null,
  layoff_certified integer not null,     -- employer reported a layoff in the 6 months before
  layoff_employers integer not null,
  median_days integer not null,          -- RECEIVED_DATE to DECISION_DATE
  p90_days integer not null
);

create table perm_layoff_employers (
  perm_fiscal_year smallint not null,
  name_key text not null,                -- norm_name of EMP_BUSINESS_NAME
  name text not null,
  employer_id bigint references employers(id),
  certified integer not null,
  layoff_certified integer not null,
  primary key (perm_fiscal_year, name_key)
);

create table employer_perm (
  perm_fiscal_year smallint not null,
  employer_id bigint not null references employers(id),
  certified integer not null,
  fw_working integer not null,
  layoff_certified integer not null,
  primary key (perm_fiscal_year, employer_id)
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
alter table warn_h1b_summary enable row level security;
alter table warn_h1b_companies enable row level security;
alter table employer_warn enable row level security;
alter table uscis_registrations enable row level security;
alter table perm_lockin_summary enable row level security;
alter table perm_layoff_employers enable row level security;
alter table employer_perm enable row level security;
alter table layoff_filings_summary enable row level security;
alter table layoff_filings_companies enable row level security;
alter table employer_layoff_filings enable row level security;
alter table employer_layoff_notices enable row level security;
alter table employer_layoff_months enable row level security;
alter table uscis_birth_country_years enable row level security;
alter table uscis_birth_country enable row level security;
alter table employer_tickers enable row level security;
alter table sec_companies enable row level security;
alter table sec_subsidiary_exhibits enable row level security;
alter table sec_subsidiaries enable row level security;
alter table employer_parents enable row level security;

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
create policy "public read warn_h1b_summary" on warn_h1b_summary for select using (true);
create policy "public read warn_h1b_companies" on warn_h1b_companies for select using (true);
create policy "public read employer_warn" on employer_warn for select using (true);
create policy "public read uscis_registrations" on uscis_registrations for select using (true);
create policy "public read perm_lockin_summary" on perm_lockin_summary for select using (true);
create policy "public read perm_layoff_employers" on perm_layoff_employers for select using (true);
create policy "public read employer_perm" on employer_perm for select using (true);
create policy "public read layoff_filings_summary" on layoff_filings_summary for select using (true);
create policy "public read layoff_filings_companies" on layoff_filings_companies for select using (true);
create policy "public read employer_layoff_filings" on employer_layoff_filings for select using (true);
create policy "public read employer_layoff_notices" on employer_layoff_notices for select using (true);
create policy "public read employer_layoff_months" on employer_layoff_months for select using (true);
create policy "public read uscis_birth_country_years" on uscis_birth_country_years for select using (true);
create policy "public read uscis_birth_country" on uscis_birth_country for select using (true);
create policy "public read employer_tickers" on employer_tickers for select using (true);
create policy "public read sec_companies" on sec_companies for select using (true);
create policy "public read sec_subsidiary_exhibits" on sec_subsidiary_exhibits for select using (true);
create policy "public read sec_subsidiaries" on sec_subsidiaries for select using (true);
create policy "public read employer_parents" on employer_parents for select using (true);

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
--   create policy "bulk insert warn_h1b_summary" on warn_h1b_summary for insert with check (true);
--   create policy "bulk insert warn_h1b_companies" on warn_h1b_companies for insert with check (true);
--   create policy "bulk insert employer_warn" on employer_warn for insert with check (true);
--   create policy "bulk insert perm_lockin_summary" on perm_lockin_summary for insert with check (true);
--   create policy "bulk insert perm_layoff_employers" on perm_layoff_employers for insert with check (true);
--   create policy "bulk insert employer_perm" on employer_perm for insert with check (true);
--   create policy "bulk insert layoff_filings_summary" on layoff_filings_summary for insert with check (true);
--   create policy "bulk insert layoff_filings_companies" on layoff_filings_companies for insert with check (true);
--   create policy "bulk insert employer_layoff_filings" on employer_layoff_filings for insert with check (true);
--   create policy "bulk insert employer_layoff_notices" on employer_layoff_notices for insert with check (true);
--   create policy "bulk insert employer_layoff_months" on employer_layoff_months for insert with check (true);
--   create policy "bulk insert uscis_birth_country_years" on uscis_birth_country_years for insert with check (true);
--   create policy "bulk insert uscis_birth_country" on uscis_birth_country for insert with check (true);
--   create policy "bulk insert employer_tickers" on employer_tickers for insert with check (true);
--   create policy "bulk insert sec_companies" on sec_companies for insert with check (true);
--   create policy "bulk insert sec_subsidiary_exhibits" on sec_subsidiary_exhibits for insert with check (true);
--   create policy "bulk insert sec_subsidiaries" on sec_subsidiaries for insert with check (true);
--   create policy "bulk insert employer_parents" on employer_parents for insert with check (true);

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

-- Per-year profile of certified H-1B LCAs: skill level, new-employment filings, occupation concentration.
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

-- Employer name search (site search, /employers?q=). `%` and `_` in the term are literal text.
-- One or two letters make too few trigrams for a fuzzy match, and a substring scan of every name
-- passes the 3 s anon statement timeout. Short terms match the start of the name through
-- employers_name_lower_prefix and rank by all-time H-1B filings. Longer terms keep the fuzzy
-- match: name prefix first, then similarity weighted by filings.
-- The prefix range uses ~>=~ and ~<~, which compare bytes as text_pattern_ops does, so the index
-- serves it. The upper bound adds chr(1114111) (U+10FFFF, the highest code point), so every name
-- that starts with the prefix is in the range. A bound such as prefix || 'zzz' would drop names
-- where a character above 'z' follows the prefix, for example 'iné' or 'in~'.
-- After a change, run `cd web && pnpm check:search` against the database.
create or replace function public.search_employers(q text, lim integer default 8)
returns table(id bigint, name text, city text, state text, filings bigint, sim real)
language sql
stable
set search_path to 'public', 'extensions'
as $function$
  with t as (
    select lower(q) as prefix,
           replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') as lit,
           char_length(q) < 3 as short
  ),
  short_hits as (
    select e.id, e.name, e.city, e.state, coalesce(y.filings, 0)::bigint as filings,
           greatest(extensions.similarity(e.name, q),
                    extensions.word_similarity(q, e.name)) as sim
    from public.employers e
    cross join t
    left join lateral (
      select sum(s.filings) as filings from public.employer_year_stats s
      where s.employer_id = e.id and s.visa_class = 'H-1B'
    ) y on true
    where t.short
      and lower(e.name) ~>=~ t.prefix
      and lower(e.name) ~<~ (t.prefix || chr(1114111))
    order by filings desc, e.id
    limit lim
  ),
  long_match as (
    select e.id, e.name, e.city, e.state,
           greatest(extensions.similarity(e.name, q),
                    extensions.word_similarity(q, e.name)) as sim
    from public.employers e, t
    where not t.short
      and (q <% e.name
           or e.name % q
           or e.name ilike '%' || t.lit || '%')
    order by (e.name ilike t.lit || '%') desc, sim desc, e.id
    limit greatest(lim * 6, 30)
  ),
  long_hits as (
    select m.id, m.name, m.city, m.state, f.filings, m.sim,
           row_number() over (
             order by (m.name ilike t.lit || '%') desc,
                      m.sim * (1 + ln(1 + f.filings::numeric) / 10) desc, m.id
           ) as rank
    from long_match m
    cross join t
    cross join lateral (
      select coalesce(sum(s.filings), 0)::bigint as filings from public.employer_year_stats s
      where s.employer_id = m.id and s.visa_class = 'H-1B'
    ) f
  ),
  hits as (
    select h.*, row_number() over (order by h.filings desc, h.id) as rank from short_hits h
    union all
    select h.* from long_hits h where h.rank <= lim
  )
  select hits.id, hits.name, hits.city, hits.state, hits.filings, hits.sim
  from hits
  order by hits.rank;
$function$;

-- Keep this block equal to etl/grants/20261022181311_explicit_data_api_grants.sql.
-- BEGIN explicit Data API grants
-- Explicit Data API grants; generated from production catalogs on 2026-10-22.
-- charlesrhoward/h1b-bench#47. Preserves existing privileges, including materialized views,
-- sequences and grant options. No RLS, ownership or default-privilege changes.
-- Intentionally mirrors Supabase's pre-change default ACLs for zero behavior change.
-- Review privilege narrowing separately; these broad grants are not a least-privilege policy.
-- Review the snapshot immediately before application.
begin;

grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_headcounts" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_headcounts" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_headcounts" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_layoff_filings" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_layoff_filings" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_layoff_filings" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_layoff_months" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_layoff_months" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_layoff_months" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_layoff_notices" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_layoff_notices" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_layoff_notices" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_market_gap" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_market_gap" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_market_gap" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_parents" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_parents" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_parents" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_perm" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_perm" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_perm" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_tickers" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_tickers" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_tickers" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_warn" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_warn" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_warn" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_whd_h1b" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_whd_h1b" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_whd_h1b" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_year_stats" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_year_stats" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employer_year_stats" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employers" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employers" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."employers" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."fy_overview" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."fy_overview" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."fy_overview" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."job_title_year_stats" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."job_title_year_stats" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."job_title_year_stats" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."labor_pool" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."labor_pool" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."labor_pool" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."labor_pool_fillable" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."labor_pool_fillable" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."labor_pool_fillable" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."labor_pool_summary" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."labor_pool_summary" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."labor_pool_summary" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."layoff_filings_companies" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."layoff_filings_companies" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."layoff_filings_companies" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."layoff_filings_summary" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."layoff_filings_summary" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."layoff_filings_summary" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."lca_cases" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."lca_cases" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."lca_cases" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."lca_dependency_profile" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."lca_dependency_profile" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."lca_dependency_profile" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."lca_year_profile" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."lca_year_profile" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."lca_year_profile" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."market_gap_summary" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."market_gap_summary" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."market_gap_summary" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."perm_layoff_employers" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."perm_layoff_employers" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."perm_layoff_employers" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."perm_lockin_summary" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."perm_lockin_summary" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."perm_lockin_summary" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."pw_source_summary" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."pw_source_summary" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."pw_source_summary" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."pw_survey_publishers" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."pw_survey_publishers" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."pw_survey_publishers" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."sec_companies" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."sec_companies" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."sec_companies" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."sec_subsidiaries" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."sec_subsidiaries" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."sec_subsidiaries" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."sec_subsidiary_exhibits" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."sec_subsidiary_exhibits" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."sec_subsidiary_exhibits" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."uscis_birth_country" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."uscis_birth_country" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."uscis_birth_country" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."uscis_birth_country_years" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."uscis_birth_country_years" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."uscis_birth_country_years" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."uscis_registrations" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."uscis_registrations" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."uscis_registrations" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."warn_h1b_companies" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."warn_h1b_companies" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."warn_h1b_companies" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."warn_h1b_summary" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."warn_h1b_summary" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."warn_h1b_summary" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."whd_h1b_top_employers" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."whd_h1b_top_employers" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."whd_h1b_top_employers" to "service_role";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."whd_h1b_years" to "anon";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."whd_h1b_years" to "authenticated";
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."whd_h1b_years" to "service_role";
grant SELECT, UPDATE, USAGE on sequence "public"."employer_layoff_notices_id_seq" to "anon";
grant SELECT, UPDATE, USAGE on sequence "public"."employer_layoff_notices_id_seq" to "authenticated";
grant SELECT, UPDATE, USAGE on sequence "public"."employer_layoff_notices_id_seq" to "service_role";
grant SELECT, UPDATE, USAGE on sequence "public"."employers_id_seq" to "anon";
grant SELECT, UPDATE, USAGE on sequence "public"."employers_id_seq" to "authenticated";
grant SELECT, UPDATE, USAGE on sequence "public"."employers_id_seq" to "service_role";
grant USAGE on schema "public" to "anon";
grant USAGE on schema "public" to "authenticated";
grant USAGE on schema "public" to "service_role";

commit;
-- END explicit Data API grants
