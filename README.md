# H1B Bench

**Who sponsors H-1B workers, what they pay, when they file, and how their filings fare.**

H1B Bench turns the U.S. Department of Labor's raw foreign-labor disclosure files into a
fast, searchable benchmark of every employer's H-1B / H-1B1 / E-3 activity — certification
rates, wages, job titles, worksites, and year-over-year trends.

- **3.75M+** Labor Condition Applications (LCA), deduplicated
- **181k+** employers, normalized
- **FY2020 – FY2026 Q3** coverage (Oct 2019 – Jun 2026)
- 100% public data — no scraping, no API keys, just the government's own files

## Features

- **Dashboard** — total filings, certification rate, filings by fiscal year, top sponsors
- **Employer leaderboard** — the heaviest H-1B filers per fiscal year with certification
  rates, denials, worker counts, and median wages
- **Employer profiles** — per-employer filing history, wage medians, top certified roles,
  and primary worksite states
- **Occupation benchmarks** — LCA volume and wages by SOC occupation code

## Data source

All data comes from the Office of Foreign Labor Certification's
[Performance Data page](https://www.dol.gov/agencies/eta/foreign-labor/performance) —
the LCA disclosure files covering the H-1B, H-1B1, and E-3 visa classes.

Things worth knowing about the data:

- **An LCA is a filing, not a visa.** Certification by DOL is one step in the H-1B process;
  it does not mean a worker was hired or a visa was granted.
- **File semantics vary.** FY2020–FY2025 files are single quarters (the "Q4" file covers
  July–September only), while FY2026 Q3 is cumulative through June 2026. Some files overlap;
  the pipeline deduplicates on `case_number`.
- **Wages are normalized** to annual dollars (hour × 2080, week × 52, bi-weekly × 26,
  month × 12) and capped to a sane $10k–$10M band for medians.
- **Employer names are as-filed.** Normalization is uppercase + punctuation collapse, so
  "Google LLC" and "GOOGLE INC." remain distinct. FEIN-based merging is on the roadmap.

## Tech stack

| Layer    | Choice |
|----------|--------|
| Frontend | Next.js 16 (App Router, Turbopack), Tailwind CSS 4 |
| Database | Supabase (Postgres 17, PostgREST, RLS read-only public access) |
| Pipeline | Python, pandas, openpyxl, parquet |
| Data     | DOL OFLC LCA quarterly disclosure files (.xlsx) |

## Quickstart

```sh
cd web
pnpm install
cp .env.example .env.local       # point at your own Supabase project
pnpm dev
```

The frontend only needs a publishable (anon) key — the database is read-only to the public
via row-level security.

## Reproducing the dataset

```sh
python3 -m venv venv && ./venv/bin/pip install pandas openpyxl pyarrow requests

# 1. Download the LCA xlsx files from dol.gov.
#    Note: Akamai bot protection blocks curl/wget — open the file URLs in a real
#    browser (or drive one programmatically) and save them to data/raw/.

# 2. Parse xlsx -> normalized parquet (one file per quarter)
./venv/bin/python -u etl/parse_lca.py

# 3. Create a Supabase project and apply etl/schema.sql

# 4. Load cases, employers, and aggregate stats
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_KEY=<publishable-key> \
  ./venv/bin/python -u etl/load_supabase.py all

# 5. Workforce headcounts: download PERM_Disclosure_Data_*.xlsx (same Akamai caveat)
#    to data/raw/, parse them, then derive and load one headcount per employer
./venv/bin/python -u etl/parse_perm.py
(cd etl && SUPABASE_URL=... SUPABASE_KEY=... ../venv/bin/python -u load_headcounts.py)

# 6. Labor pool (/labor-pool): put the ACS 2024 1-year PUMS person file (csv_pus.zip) and
#    the Census 2018 occupation crosswalk in data/raw/ (URLs in etl/labor_pool.py), then
(cd etl && SUPABASE_URL=... SUPABASE_KEY=... ../venv/bin/python -u labor_pool.py --load)
```

The labor pool test follows [docs/labor-pool-method.md](docs/labor-pool-method.md), which
was committed before the first run. Results: [docs/labor-pool-results.md](docs/labor-pool-results.md).

**% of workforce** divides an employer's certified H-1B LCAs for the fiscal year by the
total headcount it reported on its PERM green card filings (`EMP_NUM_PAYROLL`). Each
filing reports its own number, so the loader keeps the most frequently reported value and
how many filings agree with it. The UI greys out values reported on only one filing,
values fewer than 25% of filings agree on, and shares above 100%. Treat the column as an
approximation: an LCA is not a visa, and some employers report the payroll of a single
legal entity rather than the whole company.

Quarterly refresh: download the newest quarter's file, re-run steps 2–4
(re-add the anon insert policies from `etl/schema.sql` first; `load_supabase.py` is
idempotent via `case_number`).

## Project structure

```
etl/
  parse_lca.py       # xlsx -> parquet normalization (columns, dates, wages, booleans)
  load_supabase.py   # parquet -> Supabase (employers, cases, aggregate stats)
  schema.sql         # tables, indexes, RLS, views + refresh instructions
web/                 # Next.js frontend
data/                # raw xlsx + processed parquet (gitignored)
```

## Roadmap

- [ ] PERM (green card) disclosure data — employer headcounts are in; full case data is not
- [ ] FEIN-based employer entity resolution
- [ ] Employer compare pages
- [ ] Wage distribution charts (beyond medians)
- [ ] USCIS H-1B Employer Data Hub join (petition approvals/denials)

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for setup, preflight checks,
and PR conventions. The most valuable contributions right now: employer entity resolution,
PERM ingestion, and frontend visualizations.

## License

MIT — see [LICENSE](LICENSE). Government data is public domain (17 U.S.C. § 105).
