"""Load layoff_filings.py results into Supabase (layoff_filings_summary,
layoff_filings_companies, employer_layoff_filings).

Imported lazily by layoff_filings.py --load, because load_supabase reads SUPABASE_URL and
SUPABASE_KEY at import time.
"""
import logging

from load_supabase import batched, fetch_employer_id_map, post_batch, records
from warn_load import employer_rows, top_filer_ids

log = logging.getLogger(__name__)

BREAKDOWN_COLS = ["filings_after_new_employment", "filings_after_change_employer", "filings_after_not_counted"]
COMPANY_COLS = ["key", "company", "states", "notices_followed", "workers_laid_off", "first_notice",
                "filings_after", "positions_after", "filings_after_90", "filings_before", "employer_id",
                *BREAKDOWN_COLS]
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
    for batch in batched(records(employers, EMPLOYER_COLS), 2000):
        post_batch("employer_layoff_filings", batch)
    log.info(f"loaded summary, {len(top)} companies, {len(employers):,} employer rows")
