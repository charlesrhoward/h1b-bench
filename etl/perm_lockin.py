"""PERM green card filings: job already filled, prior layoffs, DOL wait, per
docs/perm-lockin-method.md.

  ./venv/bin/python -u etl/perm_lockin.py                       # compute + print
  (cd etl && SUPABASE_URL=... SUPABASE_KEY=... ../venv/bin/python -u perm_lockin.py --load)

--load needs the temporary insert policies from etl/schema.sql; truncate the three tables
first on a refresh.
"""
import logging
import os
import sys

import pandas as pd
from cli_log import configure_logging
from warn import norm_name

log = logging.getLogger(__name__)

ROOT = os.path.join(os.path.dirname(__file__), "..", "data")
PERM_YEAR = 2025
PERM_FILE = os.path.join(ROOT, "raw", f"PERM_Disclosure_Data_FY{PERM_YEAR}_Q4.xlsx")
COLS = ["CASE_NUMBER", "CASE_STATUS", "RECEIVED_DATE", "DECISION_DATE", "OCCUPATION_TYPE",
        "EMP_BUSINESS_NAME", "OTHER_REQ_IS_FW_CURRENTLY_WRK", "OTHER_REQ_EMP_LAYOFF"]
CERTIFIED = {"Certified", "Certified - Expired"}
TOP_EMPLOYERS = 15


def load_certified():
    df = pd.read_excel(PERM_FILE, usecols=COLS, dtype=str).drop_duplicates("CASE_NUMBER")
    df = df[df["CASE_STATUS"].isin(CERTIFIED)].copy()
    df["fw_working"] = df["OTHER_REQ_IS_FW_CURRENTLY_WRK"].eq("Y")
    df["layoff"] = df["OTHER_REQ_EMP_LAYOFF"].eq("Y")
    df["professional"] = df["OCCUPATION_TYPE"].eq("Professional occupation")
    days = pd.to_datetime(df["DECISION_DATE"]) - pd.to_datetime(df["RECEIVED_DATE"])
    df["days"] = days.dt.days
    df["name_key"] = df["EMP_BUSINESS_NAME"].map(norm_name)
    log.info(f"certified FY{PERM_YEAR} PERM filings: {len(df):,}")
    return df


def summarize(df):
    pro = df[df["professional"]]
    days = df["days"].dropna()
    return {
        "perm_fiscal_year": PERM_YEAR, "certified": len(df), "fw_working": int(df["fw_working"].sum()),
        "professional_certified": len(pro), "professional_fw_working": int(pro["fw_working"].sum()),
        "layoff_certified": int(df["layoff"].sum()),
        "layoff_employers": int(df.loc[df["layoff"], "name_key"].nunique()),
        "median_days": int(days.median()), "p90_days": int(days.quantile(0.9)),
    }


def by_employer(df):
    grouped = df.dropna(subset=["name_key"]).groupby("name_key").agg(
        name=("EMP_BUSINESS_NAME", lambda s: s.mode().iloc[0]),
        certified=("CASE_NUMBER", "size"), fw_working=("fw_working", "sum"), layoff_certified=("layoff", "sum"),
    ).reset_index()
    return grouped.astype({"certified": int, "fw_working": int, "layoff_certified": int})


def main():
    df = load_certified()
    summary, employers = summarize(df), by_employer(df)
    top = employers[employers["layoff_certified"] > 0].sort_values("layoff_certified", ascending=False)
    top = top.head(TOP_EMPLOYERS).copy()
    log.info(summary)
    with pd.option_context("display.width", 200):
        log.info(top.to_string(index=False))
    if "--load" not in sys.argv:
        return
    from load_supabase import batched, fetch_employer_id_map, post_batch, records
    id_map = fetch_employer_id_map()
    employers["employer_id"] = employers["name_key"].map(id_map).astype("Int64")
    top["employer_id"] = top["name_key"].map(id_map).astype("Int64")
    linked = employers.dropna(subset=["employer_id"]).assign(perm_fiscal_year=PERM_YEAR)
    post_batch("perm_lockin_summary", [summary])
    post_batch("perm_layoff_employers", records(top.assign(perm_fiscal_year=PERM_YEAR), [
        "perm_fiscal_year", "name_key", "name", "employer_id", "certified", "layoff_certified"]))
    for batch in batched(records(linked, ["perm_fiscal_year", "employer_id", "certified", "fw_working",
                                          "layoff_certified"]), 2000):
        post_batch("employer_perm", batch)
    log.info(f"loaded summary, {len(top)} layoff employers, {len(linked):,} employer rows")


if __name__ == "__main__":
    configure_logging()
    main()
