"""Load normalized LCA parquet files into Supabase (PostgREST batch inserts).

Usage:
  SUPABASE_URL=https://<ref>.supabase.co SUPABASE_KEY=<publishable-or-anon> \
    ./venv/bin/python -u etl/load_supabase.py [employers|cases|stats]

Requires schema.sql applied (anon insert policies enabled during load).
"""
import glob
import math
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
import requests

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
REST = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "processed")
BATCH = 2000


def norm_name(name):
    if not isinstance(name, str):
        return None
    n = re.sub(r"[^A-Z0-9& ]", " ", name.upper())
    n = re.sub(r"\s+", " ", n).strip()
    return n or None


def load_all_cases():
    files = sorted(glob.glob(os.path.join(OUT_DIR, "lca_FY*.parquet")))
    df = pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)
    df = df.drop_duplicates(subset="case_number", keep="first")
    return df


def post_batch(table, rows, prefer="return=minimal", retries=10):
    url = f"{REST}/{table}"
    h = {**HEADERS, "Prefer": prefer}
    for attempt in range(retries):
        try:
            r = requests.post(url, headers=h, json=rows, timeout=180)
            if r.status_code in (200, 201):
                return r
            if r.status_code == 409:
                return r  # duplicates, skip
        except requests.RequestException:
            pass
        time.sleep(min(60, 2 ** attempt))
    raise RuntimeError(f"POST {table} failed: {r.status_code} {r.text[:500]}")


def records(df, cols):
    import numpy as np

    def clean(v):
        try:
            if pd.isna(v):
                return None
        except (TypeError, ValueError):
            pass
        if hasattr(v, "isoformat") and not isinstance(v, str):
            return v.isoformat()
        if isinstance(v, np.generic):
            return v.item()
        return v

    return [{c: clean(v) for c, v in row.items()} for row in df[cols].to_dict("records")]


def batched(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def load_employers(df):
    df = df.copy()
    df["name_normalized"] = df["employer_name"].map(norm_name)
    df = df.dropna(subset=["name_normalized"])

    def mode(s):
        s = s.dropna()
        return s.mode().iloc[0] if len(s) else None

    emp = df.groupby("name_normalized").agg(
        name=("employer_name", mode),
        fein=("employer_fein", mode),
        city=("employer_city", mode),
        state=("employer_state", mode),
        postal_code=("employer_postal_code", mode),
        country=("employer_country", mode),
        naics_code=("naics_code", mode),
    ).reset_index()
    emp["naics_code"] = emp["naics_code"].astype("Int64")
    print(f"distinct employers: {len(emp):,}", flush=True)

    recs = records(emp, ["name_normalized", "name", "fein", "city", "state",
                         "postal_code", "country", "naics_code"])
    t0 = time.time()
    batches = list(batched(recs, BATCH))
    with ThreadPoolExecutor(4) as ex:
        for i, _ in enumerate(ex.map(lambda b: post_batch("employers", b), batches)):
            if (i + 1) % 10 == 0:
                print(f"  employers {i+1}/{len(batches)} batches ({time.time()-t0:.0f}s)", flush=True)
    print(f"employers loaded in {time.time()-t0:.0f}s", flush=True)
    return df


def fetch_employer_id_map():
    """name_normalized -> id, paged through PostgREST (server caps at 1000 rows/response)."""
    out = {}
    page_size = 1000
    offset = 0
    while True:
        r = requests.get(
            f"{REST}/employers",
            headers=HEADERS,
            params={"select": "id,name_normalized", "offset": offset, "limit": page_size},
            timeout=120,
        )
        r.raise_for_status()
        rows = r.json()
        for row in rows:
            out[row["name_normalized"]] = row["id"]
        if len(rows) < page_size:
            break
        offset += page_size
        if offset % 50000 == 0:
            print(f"  ...{len(out):,} employer ids", flush=True)
    print(f"fetched {len(out):,} employer ids", flush=True)
    return out


def load_cases(df):
    id_map = fetch_employer_id_map()
    df = df.copy()
    df["name_normalized"] = df["employer_name"].map(norm_name)
    df["employer_id"] = df["name_normalized"].map(id_map)
    missing = df["employer_id"].isna().sum()
    if missing:
        print(f"WARNING: {missing:,} cases without employer match", flush=True)
    df = df.dropna(subset=["employer_id"])
    df["employer_id"] = df["employer_id"].astype(int)
    df["employer_name_raw"] = df["employer_name"]

    cols = ["case_number", "employer_id", "visa_class", "case_status", "received_date",
            "decision_date", "original_cert_date", "begin_date", "end_date", "job_title",
            "soc_code", "soc_title", "full_time_position", "total_worker_positions",
            "new_employment", "continued_employment", "change_previous_employment",
            "new_concurrent_employment", "change_employer", "amended_petition",
            "employer_name_raw", "worksite_city", "worksite_county", "worksite_state",
            "worksite_postal_code", "wage_rate_of_pay_from", "wage_rate_of_pay_to",
            "wage_unit_of_pay", "wage_from_annual", "wage_to_annual", "prevailing_wage",
            "pw_wage_level", "total_worksite_locations", "h1b_dependent",
            "willful_violator", "lawfirm_name", "fiscal_year", "file_quarter"]
    recs = records(df, cols)
    batches = list(batched(recs, BATCH))
    print(f"cases: {len(recs):,} rows in {len(batches)} batches", flush=True)
    t0 = time.time()
    prefer = "resolution=ignore-duplicates,return=minimal"
    with ThreadPoolExecutor(4) as ex:
        for i, _ in enumerate(ex.map(lambda b: post_batch("lca_cases", b, prefer), batches)):
            if (i + 1) % 25 == 0:
                rate = (i + 1) * BATCH / (time.time() - t0)
                eta = (len(batches) - i - 1) * BATCH / max(rate, 1) / 60
                print(f"  cases {i+1}/{len(batches)} ({rate:.0f} rows/s, ETA {eta:.0f}m)", flush=True)
    print(f"cases loaded in {(time.time()-t0)/60:.1f}m", flush=True)


def load_stats(df):
    id_map = fetch_employer_id_map()
    df = df.copy()
    df["name_normalized"] = df["employer_name"].map(norm_name)
    df["employer_id"] = df["name_normalized"].map(id_map)
    df = df.dropna(subset=["employer_id"])
    df["employer_id"] = df["employer_id"].astype(int)

    wage = df["wage_from_annual"].where(df["wage_from_annual"].between(10000, 10000000))
    pw = df["prevailing_wage"].where(df["prevailing_wage"].between(10000, 10000000))
    df["_w"] = wage
    df["_pw"] = pw
    certified = df["case_status"] == "Certified"

    g = df.groupby(["employer_id", "fiscal_year", "visa_class"])
    stats = g.size().rename("filings").to_frame()
    stats["certified"] = g.apply(lambda x: (x["case_status"] == "Certified").sum(), include_groups=False)
    stats["denied"] = g.apply(lambda x: (x["case_status"] == "Denied").sum(), include_groups=False)
    stats["withdrawn"] = g.apply(lambda x: (x["case_status"] == "Withdrawn").sum(), include_groups=False)
    stats["certified_withdrawn"] = g.apply(lambda x: (x["case_status"] == "Certified - Withdrawn").sum(), include_groups=False)
    stats["worker_positions"] = g["total_worker_positions"].sum()
    stats["certified_worker_positions"] = g.apply(
        lambda x: x.loc[x["case_status"] == "Certified", "total_worker_positions"].sum(), include_groups=False)
    stats["median_wage_annual"] = g["_w"].median()
    stats["avg_wage_annual"] = g["_w"].mean()
    stats["median_prevailing_wage"] = g["_pw"].median()

    def top(col):
        return g[col].agg(lambda s: s.mode().iloc[0] if len(s.dropna()) else None)

    stats["top_job_title"] = top("job_title")
    stats["top_soc_code"] = top("soc_code")
    stats["top_worksite_state"] = top("worksite_state")
    stats = stats.reset_index()
    print(f"employer_year_stats: {len(stats):,} rows", flush=True)

    recs = records(stats, ["employer_id", "fiscal_year", "visa_class", "filings", "certified",
                           "denied", "withdrawn", "certified_withdrawn", "worker_positions",
                           "certified_worker_positions", "median_wage_annual", "avg_wage_annual",
                           "median_prevailing_wage", "top_job_title", "top_soc_code", "top_worksite_state"])
    batches = list(batched(recs, BATCH))
    t0 = time.time()
    prefer = "resolution=ignore-duplicates,return=minimal"
    with ThreadPoolExecutor(4) as ex:
        for i, _ in enumerate(ex.map(lambda b: post_batch("employer_year_stats", b, prefer), batches)):
            if (i + 1) % 50 == 0:
                print(f"  stats {i+1}/{len(batches)} ({time.time()-t0:.0f}s)", flush=True)
    print(f"employer_year_stats loaded in {time.time()-t0:.0f}s", flush=True)

    # job_title_year_stats
    gj = df.dropna(subset=["soc_code"]).groupby(["soc_code", "fiscal_year"])
    js = gj.size().rename("filings").to_frame()
    js["soc_title"] = gj["soc_title"].agg(lambda s: s.dropna().mode().iloc[0] if len(s.dropna()) else None)
    js["certified"] = gj.apply(lambda x: (x["case_status"] == "Certified").sum(), include_groups=False)
    js["median_wage_annual"] = gj["_w"].median()
    js["avg_wage_annual"] = gj["_w"].mean()
    js["distinct_employers"] = gj["employer_id"].nunique()
    js = js.reset_index()
    print(f"job_title_year_stats: {len(js):,} rows", flush=True)
    recs = records(js, ["soc_code", "soc_title", "fiscal_year", "filings", "certified",
                        "median_wage_annual", "avg_wage_annual", "distinct_employers"])
    batches = list(batched(recs, BATCH))
    with ThreadPoolExecutor(4) as ex:
        list(ex.map(lambda b: post_batch("job_title_year_stats", b, prefer), batches))
    print("job_title_year_stats loaded", flush=True)


def main():
    stage = sys.argv[1] if len(sys.argv) > 1 else "all"
    df = load_all_cases()
    print(f"total cases: {len(df):,}", flush=True)
    if stage in ("employers", "all"):
        load_employers(df)
    if stage in ("cases", "all"):
        load_cases(df)
    if stage in ("stats", "all"):
        load_stats(df)


if __name__ == "__main__":
    main()
