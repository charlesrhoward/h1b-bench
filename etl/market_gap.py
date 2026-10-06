"""H-1B offered pay vs. local median pay, per docs/market-gap-method.md.

Local median = OFLC Online Wage Library All Industries Level III wage (the 50th
percentile of local pay for the occupation) x 2,080 hours, matched by worksite county and
6-digit SOC, using the wage year (July-June) that contains the filing's received date.

Inputs (data/raw/):
  OFLC_Wages_2024-25.zip, OFLC_Wages_2025-26.zip   flag.dol.gov/wage-data/wage-data-downloads
  + data/processed/lca_FY2025_*.parquet (parse_lca.py)

  ./venv/bin/python -u etl/market_gap.py                       # compute + print
  (cd etl && SUPABASE_URL=... SUPABASE_KEY=... ../venv/bin/python -u market_gap.py --load)

--load needs the temporary insert policies from etl/schema.sql; truncate both tables first
on a refresh.
"""
import glob
import os
import re
import sys
import zipfile
from datetime import date

import pandas as pd

ROOT = os.path.join(os.path.dirname(__file__), "..", "data")
OUT_DIR = os.path.join(ROOT, "processed")
LCA_YEAR = 2025
HOURS_PER_YEAR = 2080
# Wage year label -> (first day, last day) and the zip that holds it
WAGE_YEARS = {
    "2024-25": (date(2024, 7, 1), date(2025, 6, 30), "OFLC_Wages_2024-25.zip"),
    "2025-26": (date(2025, 7, 1), date(2026, 6, 30), "OFLC_Wages_2025-26.zip"),
}
COUNTY_WORDS = re.compile(
    r"\b(CITY AND BOROUGH|CENSUS AREA|MUNICIPALITY|COUNTY|PARISH|BOROUGH)\b")


def normalize_county(name):
    """Uppercase, drop the county-type word and punctuation, SAINT -> ST (method rules)."""
    if not isinstance(name, str):
        return None
    n = name.upper().replace("SAINT ", "ST ")
    n = COUNTY_WORDS.sub(" ", n)
    n = re.sub(r"[^A-Z0-9 ]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n or None


def read_member(zf, suffix):
    name = next(n for n in zf.namelist() if n.endswith(suffix))
    return pd.read_csv(zf.open(name), dtype=str)


def load_wage_year(label, zip_name):
    """(county_key -> area) map and (area, soc) -> local median yearly pay for one wage year."""
    with zipfile.ZipFile(os.path.join(ROOT, "raw", zip_name)) as zf:
        geo = read_member(zf, "Geography.csv")
        alc = read_member(zf, "ALC_Export.csv")
    geo["county_key"] = geo["StateAb"].str.strip() + "|" + geo["CountyTownName"].map(normalize_county)
    ambiguous = geo.groupby("county_key")["Area"].nunique()
    geo = geo[geo["county_key"].isin(ambiguous[ambiguous == 1].index)]
    area_by_county = geo.drop_duplicates("county_key").set_index("county_key")["Area"]

    alc["local_median"] = pd.to_numeric(alc["Level3"], errors="coerce") * HOURS_PER_YEAR
    medians = alc.dropna(subset=["local_median"]).set_index(["Area", "SocCode"])["local_median"]
    print(f"wage year {label}: {len(area_by_county):,} counties, {len(medians):,} area x SOC wages", flush=True)
    return area_by_county, medians


def wage_year_for(received):
    if pd.isna(received):
        return None
    return next((label for label, (start, end, _) in WAGE_YEARS.items() if start <= received <= end), None)


def load_filings():
    cols = ["case_number", "visa_class", "case_status", "employer_name", "soc_code",
            "worksite_county", "worksite_state", "wage_rate_of_pay_from", "wage_unit_of_pay",
            "full_time_position", "received_date", "h1b_dependent"]
    files = sorted(glob.glob(os.path.join(OUT_DIR, f"lca_FY{LCA_YEAR}_*.parquet")))
    df = pd.concat([pd.read_parquet(f, columns=cols) for f in files], ignore_index=True)
    df = df.drop_duplicates("case_number")
    df = df[(df["visa_class"] == "H-1B") & (df["case_status"] == "Certified")].copy()
    certified = len(df)
    eligible = (df["wage_unit_of_pay"].str.upper().str.startswith("YEAR", na=False)
                & df["full_time_position"].fillna(False).astype(bool)
                & (df["wage_rate_of_pay_from"] > 0))
    df = df[eligible].copy()
    df["soc6"] = df["soc_code"].str.extract(r"^(\d{2}-\d{4})", expand=False)
    df["county_key"] = df["worksite_state"].str.strip() + "|" + df["worksite_county"].map(normalize_county)
    df["wage_year"] = df["received_date"].map(wage_year_for)
    print(f"FY{LCA_YEAR} certified H-1B: {certified:,}; yearly full-time with pay: {len(df):,}", flush=True)
    return df, certified


def attach_local_median(df):
    out = []
    for label, (_, _, zip_name) in WAGE_YEARS.items():
        area_by_county, medians = load_wage_year(label, zip_name)
        part = df[df["wage_year"] == label].copy()
        part["area"] = part["county_key"].map(area_by_county)
        keys = pd.MultiIndex.from_arrays([part["area"], part["soc6"]])
        part["local_median"] = medians.reindex(keys).to_numpy()
        out.append(part)
    df = pd.concat(out, ignore_index=True)
    print(f"  matched area: {df['area'].notna().mean():.1%}; matched wage: {df['local_median'].notna().mean():.1%}",
          flush=True)
    return df


def summarize(group):
    gap = group["wage_rate_of_pay_from"] - group["local_median"]
    below = gap < 0
    return pd.Series({
        "filings_matched": len(group),
        "below_median": int(below.sum()),
        "median_gap": int(round(gap.median())),
        "median_gap_below": int(round(gap[below].median())) if below.any() else None,
    })


def summary_table(matched, eligible_total):
    rows = [summarize(matched).rename("all")]
    for flag, part in matched.groupby(matched["h1b_dependent"].map({True: "true", False: "false"}).fillna("unknown")):
        rows.append(summarize(part).rename(flag))
    table = pd.DataFrame(rows).rename_axis("dependency").reset_index()
    table["filings_eligible"] = eligible_total
    return table


def main():
    filings, certified = load_filings()
    with_median = attach_local_median(filings)
    matched = with_median.dropna(subset=["local_median"])
    summary = summary_table(matched, len(filings))
    summary["filings_certified"] = certified
    with pd.option_context("display.width", 200):
        print(summary.to_string(index=False))
    matched.to_parquet(os.path.join(OUT_DIR, "market_gap_filings.parquet"), index=False)
    if "--load" in sys.argv:
        from market_gap_load import load_to_supabase
        load_to_supabase(matched, summary, LCA_YEAR)


if __name__ == "__main__":
    main()
