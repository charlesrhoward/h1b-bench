"""Domestic labor pool vs. H-1B new-employment demand, per docs/labor-pool-method.md.

Supply: ACS 2024 1-year PUMS persons who are unemployed (ESR=3), hold a bachelor's or
higher (SCHL>=21), by most recent occupation (OCCP) and state, with replicate-weight MOE.
Demand: FY2025 certified H-1B LCA new-employment positions, mapped SOC -> OCCP.

Inputs (data/raw/):
  acs_pums_2024_1yr_csv_pus.zip            www2.census.gov/programs-surveys/acs/data/pums/2024/1-Year/csv_pus.zip
  census_2018_occupation_crosswalk.xlsx
    www2.census.gov/programs-surveys/demo/guidance/industry-occupation/2018-occupation-code-list-and-crosswalk.xlsx
  + data/processed/lca_FY2025_*.parquet (parse_lca.py)

Output: data/processed/labor_pool.parquet (one row per occupation group x state, plus
state "US" for national), labor_pool_summary.parquet (headline per tier).

  ./venv/bin/python -u etl/labor_pool.py            # compute + write parquet
  (cd etl && SUPABASE_URL=... SUPABASE_KEY=... ../venv/bin/python -u labor_pool.py --load)
                                                     # also insert into labor_pool tables
--load needs the temporary insert policies from etl/schema.sql; truncate both tables first
on a refresh.
"""
import glob
import logging
import os
import re
import sys
import zipfile

import numpy as np
import pandas as pd
from cli_log import configure_logging

log = logging.getLogger(__name__)

ROOT = os.path.join(os.path.dirname(__file__), "..", "data")
PUMS_ZIP = os.path.join(ROOT, "raw", "acs_pums_2024_1yr_csv_pus.zip")
CROSSWALK = os.path.join(ROOT, "raw", "census_2018_occupation_crosswalk.xlsx")
OUT_DIR = os.path.join(ROOT, "processed")
LCA_YEAR = 2025
ACS_YEAR = 2024
REPLICATES = [f"PWGTP{i}" for i in range(1, 81)]
Z90 = 1.645

STATE_FIPS = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
    "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
    "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
    "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
    "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
    "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
    "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
    "55": "WI", "56": "WY", "72": "PR",
}


# --- Crosswalk: SOC -> Census occupation group ---------------------------------------

def load_crosswalk():
    df = pd.read_excel(CROSSWALK, "2018 Census Occ Code List", header=None, skiprows=7,
                       usecols=[1, 2, 3], names=["occ_title", "occ_code", "soc_pattern"])
    df = df.dropna(subset=["occ_code", "soc_pattern"])
    df["occ_code"] = df["occ_code"].astype(str).str.strip()
    df = df[df["occ_code"].str.fullmatch(r"\d{4}")].copy()
    df["soc_pattern"] = df["soc_pattern"].astype(str).str.strip()
    df["occ_title"] = df["occ_title"].astype(str).str.strip()
    return df


def pattern_regex(pattern):
    """SOC pattern -> (regex, wildcard count). X/Y are any digit; trailing zeros mark a broad group."""
    digits = pattern.replace("-", "")
    body = re.sub(r"[XY]", r"\\d", digits)
    wildcards = len(re.findall(r"[XY]", digits))
    trailing = len(digits) - len(digits.rstrip("0"))
    if trailing and wildcards == 0:
        body = digits[: len(digits) - trailing] + r"\d" * trailing
        wildcards = trailing
    return re.compile(f"^{body}$"), wildcards


def make_matcher(pairs):
    """(soc_pattern, code) pairs -> function mapping 6-digit SOC to the most specific code.

    Exact matches win; then the fewest wildcards; a Y pattern (the residual "other" group)
    loses ties to an X pattern, so 17-2151 lands in 1721XX, not 1721YY.
    """
    exact = {p.replace("-", ""): code for p, code in pairs}
    patterns = sorted(((*pattern_regex(p), "Y" in p, code) for p, code in pairs),
                      key=lambda t: (t[1], t[2]))
    broad = sorted((p.replace("-", ""), code) for p, code in pairs
                   if re.fullmatch(r"\d{5}0", p.replace("-", "")))

    def broad_range(digits):
        """A SOC broad code (e.g. 29-1210) spans every code up to the next broad code in its minor group."""
        below = [code for b, code in broad if b[:4] == digits[:4] and b <= digits]
        return below[-1] if below else None

    def match(soc):
        if not isinstance(soc, str):
            return None
        digits = re.sub(r"\D", "", soc)[:6]
        if len(digits) != 6:
            return None
        if digits in exact:
            return exact[digits]
        hit = next((code for rx, _, _, code in patterns if rx.match(digits)), None)
        return hit or broad_range(digits)

    return match


def build_soc_mapper(crosswalk, pums_socp_to_occp):
    """SOC -> PUMS occupation group.

    The Census crosswalk is authoritative, but PUMS collapses 40 of its 570 codes into
    broader groups (e.g. statisticians into "other mathematical science occupations").
    For those, the SOC code is re-matched against PUMS's own SOCP groups and translated to
    the OCCP code that PUMS pairs with that SOCP.
    """
    census = make_matcher(list(zip(crosswalk["soc_pattern"], crosswalk["occ_code"], strict=True)))
    pums = make_matcher([(socp, socp) for socp in pums_socp_to_occp])
    pums_occ_codes = set(pums_socp_to_occp.values())
    remapped = {}

    def to_occ(soc):
        code = census(soc)
        if code is None or code in pums_occ_codes:
            return code
        socp = pums(soc)
        target = pums_socp_to_occp.get(socp) if socp else None
        remapped[(soc[:7], code)] = target
        return target

    return to_occ, remapped


# --- Supply: ACS PUMS ------------------------------------------------------------------

def scan_pums_member(zf, name, cols):
    """One PUMS CSV: SOCP/OCCP pair counts and the unemployed bachelor's+ rows."""
    frames, pairs = [], []
    with zf.open(name) as fh:
        for chunk in pd.read_csv(fh, usecols=cols, dtype={"STATE": str, "OCCP": str, "SOCP": str},
                                 chunksize=500_000, low_memory=False):
            pairs.append(chunk[["SOCP", "OCCP"]].dropna().value_counts())
            keep = (chunk["ESR"] == 3) & (chunk["SCHL"] >= 21) & chunk["OCCP"].notna()
            frames.append(chunk[keep])
    return frames, pairs


def read_unemployed_degreed():
    """Unemployed bachelor's+ persons, plus the SOCP -> OCCP pairing PUMS uses for everyone."""
    cols = ["STATE", "PWGTP", "ESR", "SCHL", "WKL", "OCCP", "SOCP", *REPLICATES]
    frames, pairs = [], []
    with zipfile.ZipFile(PUMS_ZIP) as zf:
        for name in sorted(n for n in zf.namelist() if n.endswith(".csv")):
            member_frames, member_pairs = scan_pums_member(zf, name, cols)
            frames.extend(member_frames)
            pairs.extend(member_pairs)
            log.info(f"  read {name}")
    df = pd.concat(frames, ignore_index=True)
    df["state"] = df["STATE"].str.zfill(2).map(STATE_FIPS)
    df["occ_code"] = df["OCCP"].str.zfill(4)
    df["recent"] = df["WKL"] == 1
    log.info(f"ACS unemployed with bachelor's+: {len(df):,} sample persons, "
             f"{df['PWGTP'].sum():,.0f} weighted")
    counts = pd.concat(pairs).groupby(level=[0, 1]).sum().reset_index(name="n")
    counts = counts.sort_values("n", ascending=False).drop_duplicates("SOCP")
    socp_to_occp = {s.strip(): o.zfill(4) for s, o in zip(counts["SOCP"], counts["OCCP"], strict=True)}
    return df, socp_to_occp


def estimate_with_moe(df, keys):
    """Weighted totals plus the 90% MOE from successive-difference replicate weights."""
    sums = df.groupby(keys)[["PWGTP", *REPLICATES]].sum()
    reps = sums[REPLICATES].to_numpy()
    est = sums["PWGTP"].to_numpy()[:, None]
    se = np.sqrt(4 / 80 * ((reps - est) ** 2).sum(axis=1))
    return pd.DataFrame({"est": sums["PWGTP"], "moe": Z90 * se}, index=sums.index)


def supply_table(acs):
    national = acs.assign(state="US")
    both = pd.concat([acs, national], ignore_index=True)
    allp = estimate_with_moe(both, ["occ_code", "state"]).add_prefix("supply_")
    recent = estimate_with_moe(both[both["recent"]], ["occ_code", "state"]).add_prefix("supply_recent_")
    return allp.join(recent, how="left").fillna(0)


# --- Demand: LCA FY2025 ----------------------------------------------------------------

def demand_table(to_occ):
    files = sorted(glob.glob(os.path.join(OUT_DIR, f"lca_FY{LCA_YEAR}_*.parquet")))
    lca = pd.concat([pd.read_parquet(f, columns=["case_number", "visa_class", "case_status",
                                                  "soc_code", "worksite_state", "new_employment"])
                     for f in files], ignore_index=True).drop_duplicates("case_number")
    lca = lca[(lca["visa_class"] == "H-1B") & (lca["case_status"] == "Certified")].copy()
    lca["occ_code"] = lca["soc_code"].map(to_occ)
    unmapped = lca["occ_code"].isna().mean()
    log.info(f"LCA FY{LCA_YEAR} certified H-1B: {len(lca):,} filings, {unmapped:.2%} unmapped SOC")
    lca["state"] = lca["worksite_state"].fillna("??")
    lca["new_positions"] = lca["new_employment"].fillna(0).astype(int)
    lca = lca.dropna(subset=["occ_code"])
    both = pd.concat([lca, lca.assign(state="US")], ignore_index=True)
    return both.groupby(["occ_code", "state"]).agg(
        filings=("case_number", "size"), new_positions=("new_positions", "sum"))


# --- Decision rule ---------------------------------------------------------------------

def apply_rule(table):
    t = table.copy()
    t["supply_low"] = (t["supply_est"] - t["supply_moe"]).clip(lower=0)
    t["supply_recent_low"] = (t["supply_recent_est"] - t["supply_recent_moe"]).clip(lower=0)
    t["covered"] = t["supply_low"] >= t["new_positions"]
    t["covered_recent"] = t["supply_recent_low"] >= t["new_positions"]
    return t


def summarize(t):
    national = t[t["state"] == "US"]
    states = t[t["state"] != "US"]
    total = national["filings"].sum()
    rows = [
        ("national", national.loc[national["covered"], "filings"].sum()),
        ("recent", national.loc[national["covered_recent"], "filings"].sum()),
        ("same_state", states.loc[states["covered"], "filings"].sum()),
    ]
    return pd.DataFrame(
        [{"tier": tier, "filings_covered": int(c), "filings_total": int(total),
          "share_covered": round(c / total, 4)} for tier, c in rows])


def load_to_supabase(table, summary):
    """Insert results with the publishable key (imports load_supabase lazily: it needs env vars)."""
    from load_supabase import batched, post_batch, records

    rows = table.assign(lca_fiscal_year=LCA_YEAR, acs_year=ACS_YEAR)
    for c in ("supply_est", "supply_moe", "supply_recent_est", "supply_recent_moe"):
        rows[c] = rows[c].round().astype(int)
    cols = ["lca_fiscal_year", "acs_year", "occ_code", "state", "occ_title", "filings",
            "new_positions", "supply_est", "supply_moe", "supply_recent_est",
            "supply_recent_moe", "covered", "covered_recent"]
    for batch in batched(records(rows, cols), 2000):
        post_batch("labor_pool", batch)
    tiers = summary.assign(lca_fiscal_year=LCA_YEAR, acs_year=ACS_YEAR)
    post_batch("labor_pool_summary", records(
        tiers, ["lca_fiscal_year", "acs_year", "tier", "filings_covered", "filings_total"]))
    log.info(f"loaded {len(rows):,} labor_pool rows and {len(tiers)} summary rows")


def main():
    crosswalk = load_crosswalk()
    acs, socp_to_occp = read_unemployed_degreed()
    to_occ, remapped = build_soc_mapper(crosswalk, socp_to_occp)
    demand = demand_table(to_occ)
    supply = supply_table(acs)
    log.info("SOC codes re-matched to PUMS groups:")
    for (soc, census_code), target in sorted(remapped.items()):
        log.info(f"  {soc} (census {census_code}) -> PUMS {target}")

    table = demand.join(supply, how="left").fillna(0).reset_index()
    titles = crosswalk.drop_duplicates("occ_code").set_index("occ_code")["occ_title"]
    table["occ_title"] = table["occ_code"].map(titles)
    table = apply_rule(table)
    summary = summarize(table)

    table.to_parquet(os.path.join(OUT_DIR, "labor_pool.parquet"), index=False)
    summary.to_parquet(os.path.join(OUT_DIR, "labor_pool_summary.parquet"), index=False)
    log.info(summary.to_string(index=False))

    top = table[table["state"] == "US"].sort_values("filings", ascending=False).head(25)
    cols = ["occ_code", "occ_title", "filings", "new_positions", "supply_est", "supply_moe",
            "supply_recent_est", "covered", "covered_recent"]
    with pd.option_context("display.width", 220, "display.max_colwidth", 42):
        log.info(top[cols].round(0).to_string(index=False))

    if "--load" in sys.argv:
        load_to_supabase(table, summary)


if __name__ == "__main__":
    configure_logging()
    main()
