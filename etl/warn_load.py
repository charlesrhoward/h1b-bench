"""Load warn.py results into Supabase (warn_h1b_summary, warn_h1b_companies, employer_warn).

Imported lazily by warn.py --load, because load_supabase reads SUPABASE_URL and
SUPABASE_KEY at import time.
"""
import pandas as pd

from load_supabase import batched, fetch_employer_id_map, post_batch, records
from warn import company_key


def top_filer_ids(lca, id_map):
    """company key -> employer id of the name variant with the most certified filings."""
    lca = lca.assign(employer_id=lca["name_normalized"].map(id_map)).dropna(subset=["employer_id"])
    counts = lca.groupby(["key", "employer_id"]).size().rename("n").reset_index()
    best = counts.sort_values("n", ascending=False).drop_duplicates("key")
    return best.set_index("key")["employer_id"].astype(int)


def employer_rows(companies, id_map):
    """Every employer name variant whose company key matched, with that company's WARN totals."""
    keyed = pd.DataFrame({"name_normalized": list(id_map.keys()), "employer_id": list(id_map.values())})
    keyed["key"] = keyed["name_normalized"].map(company_key)
    rows = keyed.merge(companies[["key", "notices", "workers_laid_off", "states"]], on="key")
    return rows.drop_duplicates("employer_id")


def load_to_supabase(summary, companies, lca, top_n):
    id_map = fetch_employer_id_map()
    top = companies.head(top_n).copy()
    top["employer_id"] = top["key"].map(top_filer_ids(lca, id_map)).astype("Int64")
    post_batch("warn_h1b_summary", [summary])
    post_batch("warn_h1b_companies", records(
        top.assign(lca_fiscal_year=summary["lca_fiscal_year"]),
        ["lca_fiscal_year", "key", "company", "states", "notices", "workers_laid_off", "h1b_filings", "employer_id"]))
    employers = employer_rows(companies, id_map).assign(lca_fiscal_year=summary["lca_fiscal_year"])
    for batch in batched(records(employers, ["lca_fiscal_year", "employer_id", "notices", "workers_laid_off",
                                             "states"]), 2000):
        post_batch("employer_warn", batch)
    print(f"loaded summary, {len(top)} companies, {len(employers):,} employer rows", flush=True)
