"""Parse DOL OFLC LCA disclosure xlsx files into normalized parquet.

Input:  data/raw/LCA_Disclosure_Data_*.xlsx
Output: data/processed/lca_FY<year>.parquet  (one row per case_number)
"""
import glob
import logging
import os
import re
import sys

import pandas as pd
from cli_log import configure_logging

log = logging.getLogger(__name__)

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "processed")

# Canonical column -> possible source names across fiscal years
COLUMN_MAP = {
    "case_number": ["CASE_NUMBER"],
    "case_status": ["CASE_STATUS"],
    "received_date": ["RECEIVED_DATE"],
    "decision_date": ["DECISION_DATE"],
    "original_cert_date": ["ORIGINAL_CERT_DATE"],
    "visa_class": ["VISA_CLASS"],
    "job_title": ["JOB_TITLE"],
    "soc_code": ["SOC_CODE"],
    "soc_title": ["SOC_TITLE"],
    "full_time_position": ["FULL_TIME_POSITION"],
    "begin_date": ["BEGIN_DATE"],
    "end_date": ["END_DATE"],
    "total_worker_positions": ["TOTAL_WORKER_POSITIONS"],
    "new_employment": ["NEW_EMPLOYMENT"],
    "continued_employment": ["CONTINUED_EMPLOYMENT"],
    "change_previous_employment": ["CHANGE_PREVIOUS_EMPLOYMENT"],
    "new_concurrent_employment": ["NEW_CONCURRENT_EMPLOYMENT"],
    "change_employer": ["CHANGE_EMPLOYER"],
    "amended_petition": ["AMENDED_PETITION"],
    "employer_name": ["EMPLOYER_NAME"],
    "trade_name_dba": ["TRADE_NAME_DBA"],
    "employer_city": ["EMPLOYER_CITY"],
    "employer_state": ["EMPLOYER_STATE"],
    "employer_postal_code": ["EMPLOYER_POSTAL_CODE"],
    "employer_country": ["EMPLOYER_COUNTRY"],
    "employer_fein": ["EMPLOYER_FEIN"],
    "naics_code": ["NAICS_CODE"],
    "worksite_city": ["WORKSITE_CITY"],
    "worksite_county": ["WORKSITE_COUNTY"],
    "worksite_state": ["WORKSITE_STATE"],
    "worksite_postal_code": ["WORKSITE_POSTAL_CODE"],
    "wage_rate_of_pay_from": ["WAGE_RATE_OF_PAY_FROM"],
    "wage_rate_of_pay_to": ["WAGE_RATE_OF_PAY_TO"],
    "wage_unit_of_pay": ["WAGE_UNIT_OF_PAY"],
    "prevailing_wage": ["PREVAILING_WAGE"],
    "pw_unit_of_pay": ["PW_UNIT_OF_PAY"],
    "pw_wage_level": ["PW_WAGE_LEVEL"],
    "total_worksite_locations": ["TOTAL_WORKSITE_LOCATIONS"],
    "h1b_dependent": ["H_1B_DEPENDENT", "H-1B_DEPENDENT"],
    "willful_violator": ["WILLFUL_VIOLATOR"],
    "support_h1b": ["SUPPORT_H1B"],
    "public_disclosure": ["PUBLIC_DISCLOSURE"],
    "lawfirm_name": ["LAWFIRM_NAME_BUSINESS_NAME"],
}

DATE_COLS = ["received_date", "decision_date", "original_cert_date", "begin_date", "end_date"]
NUM_COLS = ["total_worker_positions", "new_employment", "continued_employment",
            "change_previous_employment", "new_concurrent_employment", "change_employer",
            "amended_petition", "naics_code", "total_worksite_locations"]
WAGE_COLS = ["wage_rate_of_pay_from", "wage_rate_of_pay_to", "prevailing_wage"]

UNIT_TO_ANNUAL = {"YEAR": 1.0, "MONTH": 12.0, "BI-WEEKLY": 26.0, "WEEK": 52.0, "HOUR": 2080.0}


def normalize_unit(u):
    if not isinstance(u, str):
        return None
    u = u.strip().upper().replace(" ", "").replace("_", "-")
    for k in UNIT_TO_ANNUAL:
        if u.startswith(k.replace("-", "")) or u.startswith(k):
            return k
    return None


def clean_text(s):
    if not isinstance(s, str):
        return s
    s = re.sub(r"\s+", " ", s).strip()
    return s if s else None


def select_columns(df):
    """Map each canonical column to the first source column present in this year's file."""
    out = pd.DataFrame()
    for canon, sources in COLUMN_MAP.items():
        source = next((s for s in sources if s in df.columns), None)
        out[canon] = df[source] if source else None
    return out


def coerce_types(out):
    """Clean text columns; parse dates, wages, and counts."""
    for c in out.columns:
        if c not in DATE_COLS and c not in WAGE_COLS and c not in NUM_COLS:
            out[c] = out[c].map(clean_text)
    for c in DATE_COLS:
        out[c] = pd.to_datetime(out[c], errors="coerce").dt.date
    for c in WAGE_COLS:
        out[c] = pd.to_numeric(out[c].str.replace(r"[$,]", "", regex=True), errors="coerce")
    for c in NUM_COLS:
        out[c] = pd.to_numeric(out[c], errors="coerce").astype("Int64")
    return out


def parse_file(path):
    fname = os.path.basename(path)
    m = re.search(r"FY(\d{4})(?:_Q(\d))?", fname)
    fy, qtr = int(m.group(1)), int(m.group(2) or 4)

    df = pd.read_excel(path, engine="openpyxl", dtype=str)
    df.columns = [c.strip().upper() for c in df.columns]
    out = coerce_types(select_columns(df))

    out["wage_unit_norm"] = out["wage_unit_of_pay"].map(normalize_unit)
    mult = out["wage_unit_norm"].map(UNIT_TO_ANNUAL)
    out["wage_from_annual"] = (out["wage_rate_of_pay_from"] * mult).round(0)
    out["wage_to_annual"] = (out["wage_rate_of_pay_to"] * mult).round(0)

    for b in ["full_time_position", "h1b_dependent", "willful_violator"]:
        out[b] = out[b].str.upper().str.startswith("Y")

    out["fiscal_year"] = fy
    out["file_quarter"] = qtr
    return out.drop_duplicates(subset="case_number", keep="first")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    files = sorted(glob.glob(os.path.join(RAW_DIR, "LCA_Disclosure_Data_*.xlsx")))
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for f in files:
        if only and only not in f:
            continue
        df = parse_file(f)
        m = re.search(r"FY\d{4}(?:_Q\d)?", os.path.basename(f))
        out_path = os.path.join(OUT_DIR, f"lca_{m.group(0)}.parquet")
        df.to_parquet(out_path, index=False)
        log.info(f"{os.path.basename(f)}: {len(df):,} rows -> {out_path}")


if __name__ == "__main__":
    configure_logging()
    main()
