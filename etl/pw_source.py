"""Who set the H-1B wage floor, per docs/pw-source-method.md.

Reads the FY2025 LCA disclosure xlsx files for the prevailing-wage source columns (not kept
by parse_lca.py), classifies each certified H-1B filing, and joins the market-gap match
(data/processed/market_gap_filings.parquet from market_gap.py) by case number.

  ./venv/bin/python -u etl/pw_source.py                       # compute + print
  (cd etl && SUPABASE_URL=... SUPABASE_KEY=... ../venv/bin/python -u pw_source.py --load)

--load needs the temporary insert policies from etl/schema.sql; truncate both tables first
on a refresh.
"""
import glob
import os
import sys

import pandas as pd

ROOT = os.path.join(os.path.dirname(__file__), "..", "data")
OUT_DIR = os.path.join(ROOT, "processed")
LCA_YEAR = 2025
COLS = ["CASE_NUMBER", "VISA_CLASS", "CASE_STATUS", "H_1B_DEPENDENT", "PW_WAGE_LEVEL",
        "PW_TRACKING_NUMBER", "PW_OES_YEAR", "PW_OTHER_SOURCE", "PW_SURVEY_PUBLISHER"]
OTHER_SOURCE_CLASS = {"SURVEY": "survey", "CBA": "union", "DBA": "federal_contract", "SCA": "federal_contract"}
# Firm-name grouping for survey publishers: first keyword found wins.
PUBLISHER_GROUPS = [
    ("RADFORD", "Radford (Aon)"), ("MCLAGAN", "McLagan (Aon)"), ("AON", "Aon"),
    ("WILLIS", "Willis Towers Watson"), ("TOWERS", "Willis Towers Watson"), ("WTW", "Willis Towers Watson"),
    ("MERCER", "Mercer"), ("ERI ", "ERI Economic Research Institute"), ("ECONOMIC RESEARCH", "ERI Economic Research Institute"),
    ("SALARY.COM", "Salary.com"), ("PAYSCALE", "PayScale"), ("KORN", "Korn Ferry"), ("CULPEPPER", "Culpepper"),
    ("PEARL MEYER", "Pearl Meyer"), ("AAMC", "AAMC"), ("ASSOCIATION OF AMERICAN MEDICAL", "AAMC"),
    ("CUPA", "CUPA-HR"), ("COLLEGE AND UNIVERSITY PROFESSIONAL", "CUPA-HR"),
    ("AMERICAN INSTITUTE OF ARCHITECTS", "American Institute of Architects"),
    ("MEDICAL GROUP MANAGEMENT", "MGMA"), ("BUREAU OF LABOR", "U.S. Bureau of Labor Statistics"),
    ("TRUE PARTNERS", "Mercer"),
]


def present(series):
    return series.notna() & (series.astype(str).str.strip() != "")


def classify(df):
    """Method classification, first rule that applies."""
    other = df["PW_OTHER_SOURCE"].fillna("").astype(str).str.strip().str.upper()
    source = other.map(OTHER_SOURCE_CLASS).fillna("other")
    source = source.mask(present(df["PW_OES_YEAR"]), "oews")
    return source.mask(present(df["PW_TRACKING_NUMBER"]), "dol_determination")


def publisher_group(name):
    if not isinstance(name, str) or not name.strip():
        return None
    upper = name.upper()
    return next((group for key, group in PUBLISHER_GROUPS if key in upper), name.strip())


def load_filings():
    files = sorted(glob.glob(os.path.join(ROOT, "raw", f"LCA_Disclosure_Data_FY{LCA_YEAR}_*.xlsx")))
    frames = []
    for f in files:
        frames.append(pd.read_excel(f, usecols=lambda c: str(c).strip().upper() in COLS, dtype=str))
        print(f"  read {os.path.basename(f)}", flush=True)
    df = pd.concat(frames, ignore_index=True)
    df.columns = [c.strip().upper() for c in df.columns]
    df = df.drop_duplicates("CASE_NUMBER")
    df = df[(df["VISA_CLASS"] == "H-1B") & (df["CASE_STATUS"] == "Certified")].copy()
    df["source"] = classify(df)
    dependent = df["H_1B_DEPENDENT"].fillna("").str.upper().str[:1]
    df["dependency"] = dependent.map({"Y": "true", "N": "false"}).fillna("unknown")
    df["level_1_2"] = df["PW_WAGE_LEVEL"].isin(["I", "II"])
    df["level_known"] = present(df["PW_WAGE_LEVEL"])
    df["publisher"] = df["PW_SURVEY_PUBLISHER"].where(df["source"] == "survey").map(publisher_group)
    return df


def attach_market_gap(df):
    gap = pd.read_parquet(os.path.join(OUT_DIR, "market_gap_filings.parquet"),
                          columns=["case_number", "wage_rate_of_pay_from", "local_median"])
    gap["below"] = gap["wage_rate_of_pay_from"] < gap["local_median"]
    merged = df.merge(gap[["case_number", "below"]], left_on="CASE_NUMBER", right_on="case_number", how="left")
    return merged.drop(columns=["case_number"])


def source_table(df):
    both = pd.concat([df, df.assign(dependency="all")], ignore_index=True)
    return both.groupby(["source", "dependency"]).agg(
        filings=("CASE_NUMBER", "size"),
        wage_level_known=("level_known", "sum"),
        level_1_2=("level_1_2", "sum"),
        gap_matched=("below", "count"),
        below_median=("below", lambda b: int(b.fillna(False).astype(bool).sum())),
    ).reset_index()


def publisher_table(df):
    surveys = df.dropna(subset=["publisher"])
    table = surveys.groupby("publisher").agg(
        filings=("CASE_NUMBER", "size"),
        dependent_filings=("dependency", lambda d: int((d == "true").sum())),
        gap_matched=("below", "count"),
        below_median=("below", lambda b: int(b.fillna(False).astype(bool).sum())),
    ).reset_index()
    return table.sort_values("filings", ascending=False).head(15)


def main():
    df = attach_market_gap(load_filings())
    sources, publishers = source_table(df), publisher_table(df)
    with pd.option_context("display.width", 200):
        print(sources.to_string(index=False))
        print(publishers.to_string(index=False))
    if "--load" in sys.argv:
        from load_supabase import post_batch, records
        post_batch("pw_source_summary", records(sources.assign(lca_fiscal_year=LCA_YEAR), [
            "lca_fiscal_year", "source", "dependency", "filings", "wage_level_known", "level_1_2",
            "gap_matched", "below_median"]))
        post_batch("pw_survey_publishers", records(publishers.assign(lca_fiscal_year=LCA_YEAR), [
            "lca_fiscal_year", "publisher", "filings", "dependent_filings", "gap_matched", "below_median"]))
        print(f"loaded {len(sources)} source rows and {len(publishers)} publisher rows", flush=True)


if __name__ == "__main__":
    main()
