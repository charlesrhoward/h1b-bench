"""Load market_gap.py results into Supabase (market_gap_summary, employer_market_gap).

Imported lazily by market_gap.py --load, because load_supabase reads SUPABASE_URL and
SUPABASE_KEY at import time.
"""
from load_supabase import batched, fetch_employer_id_map, norm_name, post_batch, records

SUMMARY_COLS = ["lca_fiscal_year", "dependency", "filings_certified", "filings_eligible",
                "filings_matched", "below_median", "median_gap", "median_gap_below"]
EMPLOYER_COLS = ["lca_fiscal_year", "employer_id", "filings_matched", "below_median", "median_gap"]


def employer_rows(matched, fiscal_year):
    """One row per employer: matched filings, how many offer below the local median, median gap."""
    id_map = fetch_employer_id_map()
    df = matched.assign(employer_id=matched["employer_name"].map(norm_name).map(id_map))
    df = df.dropna(subset=["employer_id"])
    df["gap"] = df["wage_rate_of_pay_from"] - df["local_median"]
    grouped = df.groupby("employer_id").agg(
        filings_matched=("gap", "size"),
        below_median=("gap", lambda g: int((g < 0).sum())),
        median_gap=("gap", lambda g: int(round(g.median()))),
    ).reset_index()
    grouped["employer_id"] = grouped["employer_id"].astype(int)
    grouped["lca_fiscal_year"] = fiscal_year
    return grouped


def load_to_supabase(matched, summary, fiscal_year):
    post_batch("market_gap_summary", records(summary.assign(lca_fiscal_year=fiscal_year), SUMMARY_COLS))
    employers = employer_rows(matched, fiscal_year)
    for batch in batched(records(employers, EMPLOYER_COLS), 2000):
        post_batch("employer_market_gap", batch)
    print(f"loaded {len(summary)} summary rows and {len(employers):,} employer rows", flush=True)


if __name__ == "__main__":
    raise SystemExit("run via: market_gap.py --load")
