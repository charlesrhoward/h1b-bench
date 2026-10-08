"""Public parent companies for subsidiary employers, per docs/employer-parents-method.md.

Source: the subsidiary list in each SEC company's latest annual report: Exhibit 21 of a 10-K, or
Exhibit 8 of a 20-F (foreign private issuers).

Inputs:
  data/raw/sec/company_tickers.json   SEC company list (tickers.py downloads it)
  Supabase sec_subsidiary_exhibits    annual reports already read, so reruns skip them
  Supabase sec_subsidiaries           names already read from those exhibits
  data/raw/sec/exhibit21.json         local checkpoint of the same, kept while a run is in progress
  data/processed/lca_FY*.parquet      filing counts per employer

  SEC_CONTACT=you@example.com SUPABASE_URL=... SUPABASE_KEY=... ./venv/bin/python -u etl/parents.py
  (cd etl && SEC_CONTACT=... SUPABASE_URL=... SUPABASE_KEY=... ../venv/bin/python -u parents.py --load)

--load needs the temporary insert policies on sec_subsidiary_exhibits, sec_subsidiaries, and
employer_parents from etl/schema.sql; truncate employer_parents first on a refresh.
"""
import html
import json
import logging
import os
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
import requests
from cli_log import configure_logging
from tickers import SEC_DIR, clean_ein, fetch_employers, filing_counts, sec_eins, sec_headers, sec_tickers
from warn import company_key

log = logging.getLogger(__name__)

SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik:010d}.json"
ARCHIVE = "https://www.sec.gov/Archives/edgar/data/{cik}/{acc}"
TOP_COMPANIES = 1500  # SEC list order, largest companies first
MIN_FILINGS = 25  # employers with fewer all-time filings are not linked
CHECKPOINT = os.path.join(SEC_DIR, "exhibit21.json")
PARENT_COLS = ["employer_id", "parent_cik", "parent_ticker", "parent_name", "relation", "filed", "source_url"]
STATE_TAG = re.compile(r"\s*/[A-Z]{2,3}/?\s*$")
ROW = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S | re.I)
CELL = re.compile(r"<td[^>]*>(.*?)</td>", re.S | re.I)
HREF = re.compile(r'href="([^"]+)"', re.I)
TAG = re.compile(r"<[^>]+>")
CELL_SPLIT = re.compile(r"\t|\s{2,}|\.{3,}")
STRIP_CHARS = " *,;" + chr(0xA0)  # space, no-break space, list marks
# Subsidiary list exhibit per annual report form.
EXHIBIT_FOR_FORM = {"10-K": "EX-21", "20-F": "EX-8"}
WORKERS = 6
MIN_INTERVAL = 0.125  # at most 8 requests a second across all workers (SEC limit: 10)
_rate_lock = threading.Lock()
_last_request = [0.0]


def wait_turn():
    """Space requests from all threads at least MIN_INTERVAL apart."""
    with _rate_lock:
        wait = _last_request[0] + MIN_INTERVAL - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        _last_request[0] = time.monotonic()


def sec_get(url):
    """GET under the SEC rate limit. None for 404; raises after three failed tries."""
    for _ in range(3):
        try:
            wait_turn()
            resp = requests.get(url, headers=sec_headers(), timeout=30)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp
        except requests.RequestException:
            time.sleep(2)
    raise RuntimeError(f"SEC request failed: {url}")


def latest_annual(cik):
    """(accession, filing date, form) of the company's most recent 10-K or 20-F, or None."""
    resp = sec_get(SUBMISSIONS_URL.format(cik=cik))
    if resp is None:
        return None
    recent = resp.json()["filings"]["recent"]
    for form, acc, filed in zip(recent["form"], recent["accessionNumber"], recent["filingDate"], strict=False):
        if form in EXHIBIT_FOR_FORM:
            return acc, filed, form
    return None


def exhibit_url(cik, acc, form):
    """URL of the subsidiary-list exhibit in a filing, from the filing index's Type column."""
    folder = ARCHIVE.format(cik=cik, acc=acc.replace("-", ""))
    resp = sec_get(f"{folder}/{acc}-index.html")
    if resp is None:
        return None
    for row in ROW.findall(resp.text):
        cells = [TAG.sub("", c).strip() for c in CELL.findall(row)]
        links = HREF.findall(row)
        if links and any(c.upper().startswith(EXHIBIT_FOR_FORM[form]) for c in cells):
            return "https://www.sec.gov" + links[0].split("?")[0]
    return None


def exhibit_names(url):
    """Text cells of a subsidiary-list exhibit: names, plus jurisdictions and headings."""
    resp = sec_get(url)
    if resp is None:
        return []
    text = html.unescape(TAG.sub("\n", resp.text))
    names = set()
    for line in text.splitlines():
        for cell in CELL_SPLIT.split(line):
            cell = re.sub(r"\s*\([^)]*\)\s*$", "", cell).strip(STRIP_CHARS)
            if 2 < len(cell) < 150 and re.search(r"[A-Za-z]", cell):
                names.add(cell)
    return sorted(names)


def read_company(cik, known):
    """Latest subsidiary list for one company. Skips the download when that report is already known."""
    latest = latest_annual(cik)
    if latest is None:
        return None
    acc, filed, form = latest
    if known.get(cik, {}).get("accession") == acc:
        return {**known[cik], "form": form}
    url = exhibit_url(cik, acc, form)
    return {"accession": acc, "filed": filed, "form": form, "url": url, "names": exhibit_names(url) if url else []}


def stored_exhibits():
    """sec_subsidiary_exhibits + sec_subsidiaries from earlier runs, merged with the local checkpoint."""
    from load_supabase import HEADERS, REST
    out = {}
    if os.path.exists(CHECKPOINT):
        with open(CHECKPOINT) as f:
            out = {int(k): v for k, v in json.load(f).items()}
    for table, fold in (("sec_subsidiary_exhibits", fold_filing), ("sec_subsidiaries", fold_name)):
        for row in fetch_all(f"{REST}/{table}", HEADERS):
            fold(out, row)
    return out


def fold_filing(out, row):
    out[int(row["cik"])] = {"accession": row["accession"], "filed": row["filed"], "form": row["form"],
                            "url": row["url"], "names": []}


def fold_name(out, row):
    entry = out.get(int(row["cik"]))
    if entry is not None and row["name"] not in entry["names"]:
        entry["names"].append(row["name"])


def fetch_all(url, headers):
    """Every row of a PostgREST table, or none when the table does not exist yet."""
    rows, offset = [], 0
    while True:
        resp = requests.get(url, headers=headers, timeout=60, params={"offset": offset, "limit": 1000})
        if resp.status_code == 404:
            return rows
        resp.raise_for_status()
        page = resp.json()
        rows += page
        offset += len(page)
        if len(page) < 1000:
            return rows


def read_exhibits(ciks):
    """Subsidiary list per CIK, read by WORKERS threads. Saves the checkpoint every 100 companies."""
    exhibits = stored_exhibits()
    known = dict(exhibits)
    log.info(f"subsidiary lists: {len(exhibits):,} companies known, {len(ciks):,} to check")
    with ThreadPoolExecutor(WORKERS) as pool:
        results = pool.map(lambda cik: (cik, read_company(cik, known)), ciks)
        for i, (cik, found) in enumerate(results, 1):
            if found is not None:
                exhibits[cik] = found
            if i % 100 == 0:
                save_checkpoint(exhibits)
                log.info(f"  {i:,} / {len(ciks):,}")
    save_checkpoint(exhibits)
    return exhibits


def save_checkpoint(exhibits):
    with open(CHECKPOINT, "w") as f:
        json.dump(exhibits, f)


def subsidiary_rows(exhibits, parents):
    """One row per (parent, Exhibit 21 name), with the parent's ticker and name."""
    rows = [{"parent_cik": cik, "key": company_key(name), "filed": e["filed"], "source_url": e["url"]}
            for cik, e in exhibits.items() if e["url"] for name in e["names"]]
    subs = pd.DataFrame(rows).dropna(subset=["key"]).drop_duplicates(["parent_cik", "key"])
    return subs.merge(parents, on="parent_cik")


def employer_keys():
    """Employers with enough filings and no ticker of their own, keyed by company_key."""
    from load_supabase import HEADERS, REST
    employers = fetch_employers()
    counts = filing_counts()
    employers["filings"] = employers["name_normalized"].map(counts).fillna(0)
    employers = employers[employers["filings"] >= MIN_FILINGS]
    with_ticker = {r["employer_id"] for r in fetch_all(f"{REST}/employer_tickers", HEADERS)}
    employers = employers[~employers["employer_id"].isin(with_ticker)]
    return employers.assign(key=employers["name_normalized"].map(company_key))


def parent_key(sec_name):
    """company_key of an SEC company name, without a trailing state tag such as "/DE/"."""
    return company_key(STATE_TAG.sub("", sec_name))


def with_relation(pairs):
    """'same_company' when the employer's FEIN is the parent's EIN, else 'subsidiary'.

    A 'subsidiary' whose name is the parent's own name matched a heading such as
    "Subsidiaries of <parent>", not a listed subsidiary, so it is dropped.
    """
    eins = sec_eins(sorted(pairs["parent_cik"].unique().tolist()))
    pairs = pairs.assign(parent_ein=pairs["parent_cik"].map(eins).map(clean_ein),
                         fein_digits=pairs["fein"].fillna("").str.replace(r"\D", "", regex=True))
    same = pairs["parent_ein"].notna() & (pairs["parent_ein"] == pairs["fein_digits"])
    pairs["relation"] = same.map({True: "same_company", False: "subsidiary"})
    own_name = ~same & (pairs["key"] == pairs["parent_name"].map(parent_key))
    log.info(f"dropped {int(own_name.sum()):,} matches on the parent's own name without an EIN match")
    return pairs[~own_name], pd.DataFrame({"cik": list(eins), "ein": [clean_ein(e) for e in eins.values()]})


def match(exhibits, sec):
    """Exact company_key matches; an employer that matches more than one parent is dropped."""
    parents = (sec.drop_duplicates("cik")
               .rename(columns={"cik": "parent_cik", "ticker": "parent_ticker", "sec_name": "parent_name"})
               [["parent_cik", "parent_ticker", "parent_name"]])
    pairs = employer_keys().merge(subsidiary_rows(exhibits, parents), on="key")
    parent_count = pairs.groupby("employer_id")["parent_cik"].transform("nunique")
    dropped = pairs[parent_count > 1]
    if len(dropped):
        log.info(f"dropped {dropped['employer_id'].nunique():,} employers that match more than one parent")
    pairs, parent_eins = with_relation(pairs[parent_count == 1].drop_duplicates("employer_id"))
    companies = parent_eins.merge(parents.rename(columns={"parent_cik": "cik", "parent_name": "sec_name"}), on="cik")
    log.info(pairs["relation"].value_counts().to_string())
    return pairs.sort_values("filings", ascending=False), companies[["cik", "ein", "sec_name"]]


def load(exhibits, rows, companies):
    from load_supabase import batched, post_batch, records
    keep_stored = "resolution=ignore-duplicates,return=minimal"
    filings = pd.DataFrame([{"cik": c, "accession": e["accession"], "filed": e["filed"], "form": e.get("form"),
                             "url": e["url"]} for c, e in exhibits.items()])
    names = pd.DataFrame([{"cik": c, "name": n} for c, e in exhibits.items() for n in e["names"]])
    tables = (("sec_companies", companies), ("sec_subsidiary_exhibits", filings), ("sec_subsidiaries", names),
              ("employer_parents", rows))
    for table, df in tables:
        cols = PARENT_COLS if table == "employer_parents" else list(df.columns)
        for batch in batched(records(df, cols), 2000):
            post_batch(table, batch, prefer=keep_stored)
        log.info(f"{table}: offered {len(df):,} rows")


def main():
    sec = sec_tickers()
    ciks = sec.drop_duplicates("cik").sort_values("order")["cik"].head(TOP_COMPANIES).tolist()
    exhibits = read_exhibits(ciks)
    rows, companies = match(exhibits, sec)
    out = os.path.join(SEC_DIR, "..", "..", "processed", "employer_parents.parquet")
    rows.to_parquet(out, index=False)
    log.info(f"{len(rows):,} employers linked to a parent; wrote {out}")
    log.info(rows[["employer_id", "name_normalized", "filings", "relation", "parent_ticker", "parent_name"]]
             .head(60).to_string(index=False))
    if "--load" in sys.argv:
        load(exhibits, rows, companies)


if __name__ == "__main__":
    configure_logging()
    main()
