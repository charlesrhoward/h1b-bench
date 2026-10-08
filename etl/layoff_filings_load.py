"""Load layoff_filings.py results into Supabase (layoff_filings_summary,
layoff_filings_companies, employer_layoff_filings, and the timeline tables
employer_layoff_notices and employer_layoff_months).

Imported lazily by layoff_filings.py --load, because load_supabase reads SUPABASE_URL and
SUPABASE_KEY at import time.
"""
import logging

from layoff_timeline import employer_keys
from load_supabase import batched, fetch_employer_id_map, post_batch, records
from warn_load import employer_rows, top_filer_ids

log = logging.getLogger(__name__)

BREAKDOWN_COLS = ["filings_after_new_employment", "filings_after_change_employer", "filings_after_not_counted"]
COMPANY_COLS = ["key", "company", "states", "notices_followed", "workers_laid_off", "first_notice",
                "filings_after", "positions_after", "filings_after_90", "filings_before", "employer_id",
                *BREAKDOWN_COLS]
NOTICE_COLS = ["employer_id", "notice_date", "state", "company", "location", "workers", "followed",
               "filings_after", "filings_before"]
MONTH_COLS = ["employer_id", "month", "new_employment", "change_employer", "not_counted"]
EMPLOYER_COLS = ["employer_id", "notices_followed", "workers_laid_off", "states", "filings_after",
                 "positions_after", "filings_before", *BREAKDOWN_COLS]


def load_to_supabase(summary, companies, lca, top_n):
    id_map = fetch_employer_id_map()
    top = companies.head(top_n).copy()
    top["employer_id"] = top["key"].map(top_filer_ids(lca, id_map)).astype("Int64")
    top["first_notice"] = top["first_notice"].dt.date.astype(str)
    post_batch("layoff_filings_summary", [summary])
    post_batch("layoff_filings_companies", records(top, COMPANY_COLS))
    employers = employer_rows(companies, id_map, list(EMPLOYER_COLS[1:]))
    post_all("employer_layoff_filings", employers, EMPLOYER_COLS)
    log.info(f"loaded summary, {len(top)} companies, {len(employers):,} employer rows")


def post_all(table, df, cols):
    for batch in batched(records(df, cols), 2000):
        post_batch(table, batch)


def load_timeline_to_supabase(notices, months):
    """Each company's notices and months, copied to every employer name variant with its key."""
    ids = employer_keys(set(notices["key"]), fetch_employer_id_map())
    notices = ids.merge(notices, on="key").assign(notice_date=lambda d: d["notice_date"].dt.date.astype(str))
    months = ids.merge(months, on="key").assign(month=lambda d: d["month"].dt.date.astype(str))
    post_all("employer_layoff_notices", notices, NOTICE_COLS)
    post_all("employer_layoff_months", months, MONTH_COLS)
    employers = ids["employer_id"].nunique()
    log.info(f"loaded {len(notices):,} notice rows and {len(months):,} month rows for {employers:,} employers")
