"""Stock tickers for employer page URLs, per docs/employer-tickers-method.md.

Inputs:
  data/raw/sec/company_tickers.json   downloaded from sec.gov/files/company_tickers.json
  Supabase sec_companies              EIN per CIK from earlier runs, so only new CIKs hit the SEC
  data/raw/sec/cik_ein.json           local checkpoint of the same, kept while a run is in progress
  data/processed/lca_FY*.parquet      filing counts, to pick one employer per ticker
  Supabase employers                  id, name_normalized, fein (read with the publishable key)

  SEC_CONTACT=you@example.com SUPABASE_URL=... SUPABASE_KEY=... ./venv/bin/python -u etl/tickers.py
  (cd etl && SEC_CONTACT=... SUPABASE_URL=... SUPABASE_KEY=... ../venv/bin/python -u tickers.py --load)

SEC rejects requests (403) unless the User-Agent names a contact email. SEC_CONTACT supplies it, so
no address is committed here.

--load needs the temporary insert policies on employer_tickers and sec_companies from
etl/schema.sql; truncate employer_tickers first on a refresh. sec_companies only grows: --load
adds CIKs it has not stored yet and never rewrites a stored row.
"""
import glob
import json
import logging
import os
import re
import sys
import time

import pandas as pd
import requests
from cli_log import configure_logging
from warn import company_key, norm_name

log = logging.getLogger(__name__)

ROOT = os.path.join(os.path.dirname(__file__), "..", "data")
SEC_DIR = os.path.join(ROOT, "raw", "sec")
TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik:010d}.json"
SEC_PAUSE_SECONDS = 0.13
TICKER_PATTERN = re.compile(r"^[A-Z][A-Z.-]{0,9}$")
OUT = os.path.join(ROOT, "processed", "employer_tickers.parquet")
COLS = ["employer_id", "ticker", "cik", "sec_name"]
SEC_COMPANY_COLS = ["cik", "ein", "sec_name"]


def sec_headers():
    """SEC asks automated clients for a User-Agent with a contact email."""
    return {"User-Agent": f"H1B Bench {os.environ['SEC_CONTACT']}"}


def sec_tickers():
    """SEC company list in file order, downloaded once."""
    path = os.path.join(SEC_DIR, "company_tickers.json")
    if not os.path.exists(path):
        os.makedirs(SEC_DIR, exist_ok=True)
        resp = requests.get(TICKERS_URL, headers=sec_headers(), timeout=60)
        resp.raise_for_status()
        with open(path, "w") as f:
            f.write(resp.text)
    with open(path) as f:
        rows = list(json.load(f).values())
    sec = pd.DataFrame(rows).rename(columns={"cik_str": "cik", "title": "sec_name"})
    sec["order"] = range(len(sec))
    sec["key"] = sec["sec_name"].map(company_key)
    return sec[sec["ticker"].str.fullmatch(TICKER_PATTERN)]


def fetch_employers():
    """id, name_normalized, fein for every employer, paged through PostgREST."""
    from load_supabase import HEADERS, REST
    out, offset = [], 0
    while True:
        resp = requests.get(f"{REST}/employers", headers=HEADERS, timeout=60, params={
            "select": "id,name_normalized,fein", "order": "id", "offset": offset, "limit": 1000})
        resp.raise_for_status()
        page = resp.json()
        out += page
        offset += len(page)
        if len(page) < 1000:
            return pd.DataFrame(out).rename(columns={"id": "employer_id"})


def fetch_ein(cik):
    """SEC-reported EIN for one CIK, or None. Retries transient errors."""
    for _ in range(3):
        try:
            resp = requests.get(SUBMISSIONS_URL.format(cik=cik), headers=sec_headers(), timeout=30)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json().get("ein") or None
        except requests.RequestException:
            time.sleep(2)
    raise RuntimeError(f"SEC submissions failed for CIK {cik}")


def stored_eins():
    """EIN per CIK already in sec_companies (a null EIN is a stored answer too)."""
    from load_supabase import HEADERS, REST
    out, offset = {}, 0
    while True:
        resp = requests.get(f"{REST}/sec_companies", headers=HEADERS, timeout=60, params={
            "select": "cik,ein", "order": "cik", "offset": offset, "limit": 1000})
        if resp.status_code == 404:
            return out  # table not created yet
        resp.raise_for_status()
        page = resp.json()
        out.update({int(row["cik"]): row["ein"] for row in page})
        offset += len(page)
        if len(page) < 1000:
            return out


def clean_ein(ein):
    """Nine-digit EIN, or None for blanks, the all-zero placeholder, and anything malformed."""
    if not isinstance(ein, str) or not re.fullmatch(r"[0-9]{9}", ein) or ein == "000000000":
        return None
    return ein


def sec_eins(ciks):
    """EIN per CIK: sec_companies first, then the local checkpoint, then the SEC for the rest."""
    path = os.path.join(SEC_DIR, "cik_ein.json")
    cache = stored_eins()
    log.info(f"sec_companies: {len(cache):,} stored CIKs")
    if os.path.exists(path):
        with open(path) as f:
            cache = {**{int(k): v for k, v in json.load(f).items()}, **cache}
    missing = [c for c in ciks if c not in cache]
    log.info(f"SEC EIN lookups: {len(missing):,} new, {len(cache):,} known")
    for cik in missing:
        cache[cik] = fetch_ein(cik)
        time.sleep(SEC_PAUSE_SECONDS)
    with open(path, "w") as f:
        json.dump(cache, f)
    return cache


def filing_counts():
    """LCA filings per normalized employer name, all years."""
    files = sorted(glob.glob(os.path.join(ROOT, "processed", "lca_FY*.parquet")))
    names = pd.concat([pd.read_parquet(f, columns=["case_number", "employer_name"]) for f in files])
    names = names.drop_duplicates("case_number")
    return names["employer_name"].map(norm_name).value_counts()


def match(employers, sec):
    """Name candidates confirmed by EIN, one ticker per employer and one employer per ticker."""
    employers = employers.assign(key=employers["name_normalized"].map(company_key),
                                 fein_digits=employers["fein"].fillna("").str.replace(r"\D", "", regex=True))
    cands = employers.merge(sec, on="key")
    log.info(f"name candidates: {len(cands):,} pairs, {cands['employer_id'].nunique():,} employers")
    eins = sec_eins(sorted(cands["cik"].unique().tolist()))
    cands["sec_ein"] = cands["cik"].map(eins).map(clean_ein)
    confirmed = cands[cands["sec_ein"].notna() & (cands["sec_ein"] == cands["fein_digits"])].copy()
    confirmed["filings"] = confirmed["name_normalized"].map(filing_counts()).fillna(0)
    confirmed = confirmed.sort_values("order").drop_duplicates("employer_id")
    confirmed = confirmed.sort_values("filings", ascending=False).drop_duplicates("ticker")
    log.info(f"EIN-confirmed: {len(confirmed):,} employers")
    companies = cands.drop_duplicates("cik").assign(ein=cands["sec_ein"])[SEC_COMPANY_COLS]
    return confirmed.sort_values("employer_id")[COLS], companies


def load(rows, companies):
    from load_supabase import batched, post_batch, records
    keep_stored = "resolution=ignore-duplicates,return=minimal"
    for batch in batched(records(companies, SEC_COMPANY_COLS), 2000):
        post_batch("sec_companies", batch, prefer=keep_stored)
    log.info(f"sec_companies: offered {len(companies):,} CIKs (stored ones are kept as they are)")
    for batch in batched(records(rows, COLS), 2000):
        post_batch("employer_tickers", batch)
    log.info(f"loaded {len(rows):,} employer_tickers rows")


def main():
    rows, companies = match(fetch_employers(), sec_tickers())
    rows.to_parquet(OUT, index=False)
    log.info(f"wrote {OUT}")
    log.info(rows.head(20).to_string(index=False))
    if "--load" in sys.argv:
        load(rows, companies)


if __name__ == "__main__":
    configure_logging()
    main()
