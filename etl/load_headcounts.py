"""Derive one PERM-reported headcount per employer and load it into employer_headcounts.

PERM filings report the employer's total headcount, but the value is self-reported per
filing and noisy: some filings give a single site's count, some carry typos (an extra
zero). The most frequently reported value is the stable signal, so each FEIN gets its
mode (ties broken toward the larger value), plus how many filings agree with it.

Employers match by FEIN first. An employer with no FEIN match falls back to an exact
normalized-name match, but only when that PERM name belongs to a single FEIN.

Usage (after parse_perm.py, with the anon insert policy from schema.sql enabled):
  SUPABASE_URL=https://<ref>.supabase.co SUPABASE_KEY=<publishable-key> \
    ./venv/bin/python -u etl/load_headcounts.py [--dry-run]

Refresh: truncate employer_headcounts first; rows are insert-only.
"""
import glob
import os
import re
import sys

import pandas as pd
import requests

from load_supabase import HEADERS, OUT_DIR, REST, batched, norm_name, post_batch, records

COLUMNS = ["employer_id", "employee_count", "agreeing_filings", "perm_filings",
           "latest_received", "match_method"]


def load_perm_filings():
    files = sorted(glob.glob(os.path.join(OUT_DIR, "perm_FY*.parquet")))
    if not files:
        sys.exit("no perm_FY*.parquet files; run etl/parse_perm.py first")
    df = pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)
    df = df.drop_duplicates(subset="case_number", keep="last")
    df = df[df["num_employees"].fillna(0) > 0].dropna(subset=["employer_fein"])
    df["name_normalized"] = df["employer_name"].map(norm_name)
    return df


def mode_with_agreement(counts):
    """Most frequent headcount (larger wins ties) and how many filings reported it."""
    freq = counts.value_counts()
    top = freq[freq == freq.max()].index.max()
    return pd.Series({"employee_count": int(top), "agreeing_filings": int(freq.max()),
                      "perm_filings": len(counts)})


def headcounts_by_fein(perm):
    stats = perm.groupby("employer_fein")["num_employees"].apply(mode_with_agreement).unstack()
    stats["latest_received"] = perm.groupby("employer_fein")["received_date"].max()
    return stats.astype({"employee_count": int, "agreeing_filings": int, "perm_filings": int})


def unambiguous_name_to_fein(perm):
    """PERM normalized name -> FEIN, keeping only names filed under exactly one FEIN."""
    feins = perm.dropna(subset=["name_normalized"]).groupby("name_normalized")["employer_fein"].unique()
    return {name: f[0] for name, f in feins.items() if len(f) == 1}


def fetch_employers():
    """id, name_normalized, fein for every employer, paged (PostgREST caps responses at 1000)."""
    rows, offset, page_size = [], 0, 1000
    while True:
        r = requests.get(f"{REST}/employers", headers=HEADERS, timeout=120, params={
            "select": "id,name_normalized,fein", "order": "id",
            "offset": offset, "limit": page_size})
        r.raise_for_status()
        page = r.json()
        rows.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    print(f"fetched {len(rows):,} employers", flush=True)
    emp = pd.DataFrame(rows)
    emp["fein"] = emp["fein"].map(lambda v: re.sub(r"\D", "", v) if isinstance(v, str) else None)
    return emp


def match_employers(emp, stats, name_to_fein):
    emp = emp.copy()
    emp["match_method"] = None
    by_fein = emp["fein"].isin(stats.index)
    emp.loc[by_fein, "match_method"] = "fein"
    emp["perm_fein"] = emp["fein"].where(by_fein)

    by_name = ~by_fein & emp["name_normalized"].isin(name_to_fein.keys())
    emp.loc[by_name, "match_method"] = "name"
    emp.loc[by_name, "perm_fein"] = emp.loc[by_name, "name_normalized"].map(name_to_fein)

    matched = emp.dropna(subset=["perm_fein"]).join(stats, on="perm_fein")
    return matched.rename(columns={"id": "employer_id"})


def main():
    dry_run = "--dry-run" in sys.argv
    perm = load_perm_filings()
    stats = headcounts_by_fein(perm)
    print(f"PERM: {len(perm):,} filings with headcount across {len(stats):,} FEINs", flush=True)

    matched = match_employers(fetch_employers(), stats, unambiguous_name_to_fein(perm))
    print(matched["match_method"].value_counts().to_string(), flush=True)
    if dry_run:
        return

    recs = records(matched, COLUMNS)
    for batch in batched(recs, 2000):
        post_batch("employer_headcounts", batch)
    print(f"employer_headcounts loaded: {len(recs):,} rows", flush=True)


if __name__ == "__main__":
    main()
