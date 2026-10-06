"""WARN layoff notices from employers with certified H-1B filings, per docs/warn-method.md.

Inputs (data/raw/):
  tx_warn.json            data.texas.gov/resource/8w53-c4f6.json?$limit=50000
  ca_warn_2024-25.pdf     edd.ca.gov .../warn-report-for-7-1-2024-to-06-30-2025.pdf
  + data/processed/lca_FY2025_*.parquet (parse_lca.py)

  ./venv/bin/python -u etl/warn.py                             # compute + print
  (cd etl && SUPABASE_URL=... SUPABASE_KEY=... ../venv/bin/python -u warn.py --load)

--load needs the temporary insert policies from etl/schema.sql; truncate the three tables
first on a refresh.
"""
import glob
import json
import os
import re
import sys
from datetime import date

import pandas as pd
import pdfplumber

ROOT = os.path.join(os.path.dirname(__file__), "..", "data")
LCA_YEAR = 2025
WINDOWS = {"TX": (date(2024, 10, 1), date(2025, 9, 30)), "CA": (date(2024, 10, 1), date(2025, 6, 30))}
LEGAL_FORMS = {"INC", "INCORPORATED", "LLC", "L L C", "CORP", "CORPORATION", "CO", "COMPANY",
               "LTD", "LIMITED", "LP", "LLP", "PLLC", "PC"}
TOP_COMPANIES = 20


def norm_name(name):
    """Same normalization as etl/load_supabase.py (kept local: that module needs env vars)."""
    if not isinstance(name, str):
        return None
    n = re.sub(r"[^A-Z0-9& ]", " ", name.upper())
    n = re.sub(r"\s+", " ", n).strip()
    return n or None


def company_key(name):
    """norm_name, drop ' DBA ...', strip trailing legal-form words and a leading THE (method)."""
    n = norm_name(name)
    if not n:
        return None
    n = re.split(r"\b(?:DBA|D B A)\b", n)[0].strip()
    changed = True
    while changed and n:
        changed = False
        for form in sorted(LEGAL_FORMS, key=len, reverse=True):
            if n.endswith(" " + form):
                n, changed = n[: -len(form) - 1].strip(), True
    n = re.sub(r"^THE ", "", n)
    return n or None


def load_tx():
    rows = json.load(open(os.path.join(ROOT, "raw", "tx_warn.json")))
    df = pd.DataFrame(rows)
    return pd.DataFrame({
        "state": "TX",
        "company": df["job_site_name"],
        "notice_date": pd.to_datetime(df["notice_date"], errors="coerce").dt.date,
        "workers": pd.to_numeric(df["total_layoff_number"], errors="coerce").fillna(0).astype(int),
    })


def load_ca():
    rows = []
    with pdfplumber.open(os.path.join(ROOT, "raw", "ca_warn_2024-25.pdf")) as pdf:
        for page in pdf.pages:
            for r in page.extract_table() or []:
                if r and r[0] and re.match(r"\d{2}/\d{2}/\d{4}", r[0]):
                    rows.append({"notice_date": r[0], "company": r[3], "workers": r[5]})
    df = pd.DataFrame(rows)
    return pd.DataFrame({
        "state": "CA",
        "company": df["company"].str.replace(r"\s+", " ", regex=True),
        "notice_date": pd.to_datetime(df["notice_date"], format="%m/%d/%Y", errors="coerce").dt.date,
        "workers": pd.to_numeric(df["workers"].str.replace(",", ""), errors="coerce").fillna(0).astype(int),
    })


def load_notices():
    notices = pd.concat([load_tx(), load_ca()], ignore_index=True).dropna(subset=["notice_date"])
    in_window = notices.apply(lambda r: WINDOWS[r["state"]][0] <= r["notice_date"] <= WINDOWS[r["state"]][1], axis=1)
    notices = notices[in_window].copy()
    notices["key"] = notices["company"].map(company_key)
    print(f"WARN notices in window: {len(notices):,} ({notices['state'].value_counts().to_dict()})", flush=True)
    return notices.dropna(subset=["key"])


def load_h1b():
    files = sorted(glob.glob(os.path.join(ROOT, "processed", f"lca_FY{LCA_YEAR}_*.parquet")))
    lca = pd.concat([pd.read_parquet(f, columns=["case_number", "visa_class", "case_status", "employer_name"])
                     for f in files], ignore_index=True).drop_duplicates("case_number")
    lca = lca[(lca["visa_class"] == "H-1B") & (lca["case_status"] == "Certified")].copy()
    lca["key"] = lca["employer_name"].map(company_key)
    lca["name_normalized"] = lca["employer_name"].map(norm_name)
    return lca.dropna(subset=["key"])


def match(notices, lca):
    filings = lca.groupby("key").size().rename("h1b_filings")
    matched = notices[notices["key"].isin(filings.index)]
    companies = matched.groupby("key").agg(
        company=("company", lambda s: s.mode().iloc[0]),
        states=("state", lambda s: ",".join(sorted(s.unique()))),
        notices=("company", "size"),
        workers_laid_off=("workers", "sum"),
    ).join(filings).reset_index()
    return companies.sort_values("workers_laid_off", ascending=False)


def main():
    notices, lca = load_notices(), load_h1b()
    companies = match(notices, lca)
    summary = {"lca_fiscal_year": LCA_YEAR, "notices_in_window": len(notices),
               "companies_matched": len(companies), "notices_matched": int(companies["notices"].sum()),
               "workers_laid_off": int(companies["workers_laid_off"].sum()),
               "h1b_filings": int(companies["h1b_filings"].sum())}
    print(summary, flush=True)
    with pd.option_context("display.width", 200, "display.max_colwidth", 40):
        print(companies.head(TOP_COMPANIES).to_string(index=False))
    if "--load" in sys.argv:
        from warn_load import load_to_supabase
        load_to_supabase(summary, companies, lca, TOP_COMPANIES)


if __name__ == "__main__":
    main()
