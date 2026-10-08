"""Per-company timeline data for employer pages (docs/layoff-filings-method.md, measure 8).

Called by layoff_filings.py. Pure pandas: no Supabase access, so it runs without credentials.
"""
import logging

import numpy as np
import pandas as pd
from warn import company_key

log = logging.getLogger(__name__)

# Months with complete data: decided filings start Oct 1, 2019 and end Jun 30, 2026 (method).
MONTH_START, MONTH_END = pd.Timestamp("2019-10-01"), pd.Timestamp("2026-06-01")
FOLLOW_DAYS = 365
NOTICE_COLS = ["key", "notice_date", "state", "company", "location", "workers", "followed",
               "filings_after", "filings_before"]
MONTH_KINDS = ["new_employment", "change_employer", "not_counted"]


def count_between(sorted_dates, starts, ends):
    """For each [start, end] pair, how many of `sorted_dates` fall inside it."""
    lo = np.searchsorted(sorted_dates, starts, side="left")
    hi = np.searchsorted(sorted_dates, ends, side="right")
    return hi - lo


def notice_counts(company_notices, filing_dates):
    """One company's notices with counted filings 1 to 365 days after and before each."""
    dates = company_notices["notice_date"].to_numpy()
    day, year = np.timedelta64(1, "D"), np.timedelta64(FOLLOW_DAYS, "D")
    return company_notices.assign(
        filings_after=count_between(filing_dates, dates + day, dates + year),
        filings_before=count_between(filing_dates, dates - year, dates - day),
    )


def notice_rows(matched, lca, keys):
    """Every matched notice of the companies in `keys`, with per-notice counts."""
    dates_by_key = {k: np.sort(g["received"].to_numpy()) for k, g in lca.groupby("key")}
    ours = matched[matched["key"].isin(keys)]
    parts = [notice_counts(ns, dates_by_key[key]) for key, ns in ours.groupby("key")]
    notices = pd.concat(parts, ignore_index=True)
    notices["location"] = notices["location"].astype("string").str.strip().replace("", pd.NA)
    notices["workers"] = notices["workers"].astype("Int64")
    return notices[NOTICE_COLS].sort_values(["key", "notice_date"])


def monthly_rows(lca, not_counted, keys):
    """Certified H-1B filings per company and month received, split as in measure 7."""
    kinds = pd.concat([
        lca[["key", "received"]].assign(
            kind=np.where(lca["new_employment"].fillna(0) >= 1, "new_employment", "change_employer")),
        not_counted.assign(kind="not_counted"),
    ], ignore_index=True)
    kinds = kinds[kinds["key"].isin(keys) & kinds["received"].between(MONTH_START, MONTH_END, inclusive="left")]
    kinds["month"] = kinds["received"].dt.to_period("M").dt.to_timestamp()
    counts = kinds.groupby(["key", "month", "kind"]).size().unstack("kind", fill_value=0)
    return counts.reindex(columns=MONTH_KINDS, fill_value=0).reset_index()


def employer_keys(keys, id_map):
    """employer_id -> company key, for every employer name variant whose key is in `keys`."""
    names = pd.DataFrame({"name_normalized": list(id_map.keys()), "employer_id": list(id_map.values())})
    names["key"] = names["name_normalized"].map(company_key)
    return names[names["key"].isin(keys)][["employer_id", "key"]].drop_duplicates("employer_id")


def timeline(companies, matched, lca, not_counted):
    """(notices, months) for every company with a followed notice, keyed on company key."""
    keys = set(companies["key"])
    notices = notice_rows(matched, lca, keys)
    months = monthly_rows(lca, not_counted, keys)
    log.info(f"timeline: {len(notices):,} notices and {len(months):,} company months for {len(keys):,} companies")
    return notices, months
