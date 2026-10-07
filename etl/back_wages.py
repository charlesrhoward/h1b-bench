"""H-1B back wages from DOL WHD enforcement data, per docs/back-wages-method.md.

Input: data/raw/WHD_enforcement.zip (data.dol.gov/data-catalog/WHD/enforcement/WHD_enforcement.zip)

  ./venv/bin/python -u etl/back_wages.py                       # compute + print
  (cd etl && SUPABASE_URL=... SUPABASE_KEY=... ../venv/bin/python -u back_wages.py --load)

--load needs the temporary insert policies from etl/schema.sql; truncate the three tables
first on a refresh.
"""
import logging
import os
import sys
import zipfile

import pandas as pd
from cli_log import configure_logging

log = logging.getLogger(__name__)

ROOT = os.path.join(os.path.dirname(__file__), "..", "data")
WHD_ZIP = os.path.join(ROOT, "raw", "WHD_enforcement.zip")
COLS = ["CASE_ID", "LEGAL_NAME", "TRADE_NM", "ST_CD", "FINDINGS_END_DATE",
        "H1B_VIOLTN_CNT", "H1B_BW_ATP_AMT", "H1B_EE_ATP_CNT", "H1B_CMP_ASSD_AMT"]
NUMERIC = ["H1B_VIOLTN_CNT", "H1B_BW_ATP_AMT", "H1B_EE_ATP_CNT", "H1B_CMP_ASSD_AMT"]
TOP_EMPLOYERS = 25


def norm_name(name):
    """Same normalization as etl/load_supabase.py (kept local: that module needs env vars)."""
    import re
    if not isinstance(name, str):
        return None
    n = re.sub(r"[^A-Z0-9& ]", " ", name.upper())
    n = re.sub(r"\s+", " ", n).strip()
    return n or None


def load_cases():
    frames = []
    with zipfile.ZipFile(WHD_ZIP) as zf:
        for name in sorted(n for n in zf.namelist() if n.endswith(".csv")):
            frames.append(pd.read_csv(zf.open(name), usecols=COLS, dtype=str, low_memory=False))
    df = pd.concat(frames, ignore_index=True).drop_duplicates("CASE_ID")
    for c in NUMERIC:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)
    log.info(f"WHD concluded cases: {len(df):,}")
    df = df[(df["H1B_VIOLTN_CNT"] > 0) | (df["H1B_BW_ATP_AMT"] > 0)].copy()
    end = pd.to_datetime(df["FINDINGS_END_DATE"], errors="coerce")
    df["fiscal_year"] = (end.dt.year + (end.dt.month >= 10).astype("Int64")).astype("Int64")
    df["display_name"] = df["LEGAL_NAME"].where(df["LEGAL_NAME"].fillna("").str.strip() != "", df["TRADE_NM"])
    log.info(f"H-1B cases: {len(df):,}; back wages ${df['H1B_BW_ATP_AMT'].sum():,.0f}")
    return df


def year_table(df):
    by_year = df.dropna(subset=["fiscal_year"]).groupby("fiscal_year").agg(
        cases=("CASE_ID", "size"), back_wages=("H1B_BW_ATP_AMT", "sum"),
        employees=("H1B_EE_ATP_CNT", "sum"), penalties=("H1B_CMP_ASSD_AMT", "sum"),
    ).reset_index()
    return by_year.astype({"fiscal_year": int, "cases": int, "back_wages": int, "employees": int, "penalties": int})


def top_employers(df):
    df = df.assign(name_key=df["display_name"].map(norm_name))
    grouped = df.groupby("name_key").agg(
        name=("display_name", lambda s: s.mode().iloc[0] if s.notna().any() else None),
        state=("ST_CD", lambda s: s.mode().iloc[0] if s.notna().any() else None),
        cases=("CASE_ID", "size"), back_wages=("H1B_BW_ATP_AMT", "sum"), employees=("H1B_EE_ATP_CNT", "sum"),
        penalties=("H1B_CMP_ASSD_AMT", "sum"),
    ).reset_index()
    grouped = grouped.sort_values("back_wages", ascending=False).head(TOP_EMPLOYERS).copy()
    return grouped.astype({"cases": int, "back_wages": int, "employees": int, "penalties": int})


def linked_ids(df, id_map):
    """Per case: the employer whose normalized name equals the legal name, else the trade name."""
    legal = df["LEGAL_NAME"].map(norm_name).map(id_map)
    return legal.fillna(df["TRADE_NM"].map(norm_name).map(id_map))


def top_employer_ids(df, top, id_map):
    """Per top-employer row: the employer most of its cases link to, by the same rule as employer_links."""
    linked = df.assign(name_key=df["display_name"].map(norm_name), employer_id=linked_ids(df, id_map))
    best = linked.dropna(subset=["employer_id"]).groupby("name_key")["employer_id"].agg(lambda s: s.mode().iloc[0])
    return top["name_key"].map(best).astype("Int64")


def employer_links(df, id_map):
    """Per H1B Bench employer: cases whose legal or trade name exactly matches its normalized name."""
    linked = df.assign(employer_id=linked_ids(df, id_map)).dropna(subset=["employer_id"])
    out = linked.groupby("employer_id").agg(
        cases=("CASE_ID", "size"), back_wages=("H1B_BW_ATP_AMT", "sum"), employees=("H1B_EE_ATP_CNT", "sum"),
        penalties=("H1B_CMP_ASSD_AMT", "sum"), latest_fiscal_year=("fiscal_year", "max"),
    ).reset_index()
    log.info(f"linked {len(linked):,} of {len(df):,} H-1B cases to {len(out):,} employers")
    return out.astype({"employer_id": int, "cases": int, "back_wages": int, "employees": int, "penalties": int})


def main():
    df = load_cases()
    years, top = year_table(df), top_employers(df)
    with pd.option_context("display.width", 200):
        log.info(years.tail(12).to_string(index=False))
        log.info(top.head(12).to_string(index=False))
    if "--load" not in sys.argv:
        return
    from load_supabase import batched, fetch_employer_id_map, post_batch, records
    id_map = fetch_employer_id_map()
    top["employer_id"] = top_employer_ids(df, top, id_map)
    links = employer_links(df, id_map)
    post_batch("whd_h1b_years", records(years, ["fiscal_year", "cases", "back_wages", "employees", "penalties"]))
    post_batch("whd_h1b_top_employers", records(top, ["name_key", "name", "state", "employer_id", "cases",
                                                     "back_wages", "employees", "penalties"]))
    for batch in batched(records(links, ["employer_id", "cases", "back_wages", "employees", "penalties",
                                         "latest_fiscal_year"]), 2000):
        post_batch("employer_whd_h1b", batch)
    log.info(f"loaded {len(years)} years, {len(top)} top employers, {len(links):,} employer links")


if __name__ == "__main__":
    configure_logging()
    main()
