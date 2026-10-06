# H1B Bench

Who sponsors H-1B workers, what they pay, when they file, and how their filings fare —
built on official U.S. DOL Office of Foreign Labor Certification (OFLC) disclosure data.

## Data

Source: [DOL OFLC Performance Data](https://www.dol.gov/agencies/eta/foreign-labor/performance)
— LCA (Labor Condition Application) quarterly disclosure files covering H-1B, H-1B1, and E-3
visa classes.

- **Coverage**: FY2020 Q1 – FY2026 Q3 (25 quarterly files)
- **Note on file semantics**: FY2020–FY2025 files are single quarters (the "Q4" file covers
  Jul–Sep only). FY2026 Q3 is cumulative Oct 2025 – Jun 2026. Some files (e.g. FY2021 Q3)
  contain cumulative overlap — the loader dedupes on `case_number`.
- `data/raw/` — original xlsx (gitignored, ~2.6 GB)
- `data/processed/` — normalized parquet per quarter (gitignored)

## Pipeline

```sh
python3 -m venv venv && ./venv/bin/pip install pandas openpyxl pyarrow requests

# 1. Download xlsx from dol.gov (Akamai blocks curl — use a real browser;
#    navigating Chrome to the file URL downloads it to ~/Downloads)

# 2. Parse xlsx -> parquet (normalize columns, dates, wages, booleans)
./venv/bin/python -u etl/parse_lca.py

# 3. Apply schema.sql to Supabase (mcp apply_migration or SQL editor)

# 4. Load into Supabase (requires temporary anon insert policies — see schema.sql;
#    they were dropped after the initial load, re-add them before a refresh)
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_KEY=<anon-or-publishable> \
  ./venv/bin/python -u etl/load_supabase.py all

# 5. Aggregate tables (employer_year_stats, job_title_year_stats) are computed
#    locally from parquet by the same loader's "stats" stage:
./venv/bin/python -u etl/load_supabase.py stats  # with env vars set
```

Wages are normalized to annual dollars (`wage_from_annual` / `wage_to_annual`) using
hour×2080, week×52, bi-weekly×26, month×12.

## Schema

- `employers` — one row per normalized employer name (WHO)
- `lca_cases` — one row per LCA case: visa class (WHAT), dates (WHEN), status/wages/
  worksites/SOC roles (HOW)
- `employer_year_stats` — employer × fiscal year × visa class rollup (leaderboard)
- `job_title_year_stats` — SOC occupation × fiscal year rollup (occupation benchmarks)

## Web

Next.js 16 + Tailwind 4 + @supabase/supabase-js (publishable key, read-only RLS).

```sh
cd web && pnpm install && pnpm dev
```

Pages: `/` dashboard, `/employers` leaderboard, `/employers/[id]` employer detail,
`/jobs` occupation benchmarks.
