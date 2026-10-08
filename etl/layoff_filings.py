"""Layoffs, then H-1B filings for new workers, per docs/layoff-filings-method.md.

Inputs:
  data/raw/warn_notices_hf.csv   huggingface.co/datasets/APProjects/us-warn-act-layoffs-notices-daily
                                 resolve/<WARN_REVISION>/data/warn_notices.csv (all states but CA)
  data/raw/ca_warn_20*.pdf       California EDD yearly WARN reports (ca_warn.py)
  data/processed/lca_FY*.parquet (parse_lca.py)

  ./venv/bin/python -u etl/layoff_filings.py                             # compute + print
  (cd etl && SUPABASE_URL=... SUPABASE_KEY=... ../venv/bin/python -u layoff_filings.py --load)
  ... layoff_filings.py --load-timeline   # only the two timeline tables (measure 8)

--load needs the temporary insert policies from etl/schema.sql; truncate the five
layoff tables (three layoff_filings tables, two timeline tables) first on a refresh.
"""
import glob
import logging
import os
import sys

import numpy as np
import pandas as pd
from ca_warn import load_ca_notices
from cli_log import configure_logging
from layoff_timeline import timeline
from warn import company_key, norm_name

log = logging.getLogger(__name__)

ROOT = os.path.join(os.path.dirname(__file__), "..", "data")
WARN_REVISION = "5c98e601843f08a1a3ec5b91f7e60a9701b784d1"
NOTICE_START, NOTICE_END = pd.Timestamp("2020-10-01"), pd.Timestamp("2025-06-30")
FOLLOW_DAYS, SHORT_DAYS = 365, 90
TOP_COMPANIES = 20
# Notices dropped at verification (method, "Amendment"). Dropped, not corrected.
EXCLUDED_NOTICES = {
    "ffe09f0a8ed05508": "HyAxiom, CT, 2024-11-14: 4918 workers; press reports give 67 (49 + 18 at two sites)",
}
LCA_COLS = ["case_number", "visa_class", "case_status", "employer_name", "received_date",
            "worksite_state", "new_employment", "change_employer"]


def load_notices():
    """WARN notices dated in the window, keyed on company and company_canonical."""
    hf = pd.read_csv(os.path.join(ROOT, "raw", "warn_notices_hf.csv"), low_memory=False)
    hf = hf[(hf["state"] != "CA") & ~hf["id"].isin(EXCLUDED_NOTICES)]
    hf["notice_date"] = pd.to_datetime(hf["notice_date"], errors="coerce")
    raw = pd.concat([hf, load_ca_notices()], ignore_index=True)
    log.info(f"WARN rows: {len(raw):,}; without a notice date: {int(raw['notice_date'].isna().sum()):,}")
    notices = raw[raw["notice_date"].between(NOTICE_START, NOTICE_END)].copy()
    notices["workers"] = pd.to_numeric(notices["employees_affected"], errors="coerce")
    notices["key_raw"] = notices["company"].map(company_key)
    notices["key_canon"] = notices["company_canonical"].map(company_key)
    log.info(f"WARN notices in window: {len(notices):,} from {notices['state'].nunique()} states")
    return notices


def load_filings():
    """Certified H-1B LCAs, split: counted (at least one worker new to the company) and not counted
    (extensions, amendments, and concurrent jobs only; method measure 7)."""
    files = sorted(glob.glob(os.path.join(ROOT, "processed", "lca_FY*.parquet")))
    lca = pd.concat([pd.read_parquet(f, columns=LCA_COLS) for f in files], ignore_index=True)
    lca = lca.drop_duplicates("case_number")
    lca = lca[(lca["visa_class"] == "H-1B") & (lca["case_status"] == "Certified")].copy()
    lca["positions"] = lca["new_employment"].fillna(0) + lca["change_employer"].fillna(0)
    lca["received"] = pd.to_datetime(lca["received_date"], errors="coerce")
    lca["key"] = lca["employer_name"].map(company_key)
    lca = lca.dropna(subset=["key", "received"])
    not_counted = lca.loc[lca["positions"] < 1, ["key", "received"]]
    lca = lca[lca["positions"] >= 1].copy()
    lca["name_normalized"] = lca["employer_name"].map(norm_name)
    first, last = lca["received"].min(), lca["received"].max()
    log.info(f"counted H-1B filings: {len(lca):,} (received {first:%Y-%m-%d} to {last:%Y-%m-%d})")
    log.info(f"not counted (extensions, amendments, concurrent): {len(not_counted):,}")
    return lca, not_counted


def assign_keys(notices, filer_keys):
    """Match on the raw company key first, then the canonical one (method: either may match)."""
    raw_hit = notices["key_raw"].where(notices["key_raw"].isin(filer_keys))
    canon_hit = notices["key_canon"].where(notices["key_canon"].isin(filer_keys))
    return notices.assign(key=raw_hit.fillna(canon_hit))


def days_since_notice(filing_dates, notice_dates):
    """Days from the latest notice strictly before each filing (inf when there is none)."""
    idx = np.searchsorted(notice_dates, filing_dates, side="left") - 1
    gap = (filing_dates - notice_dates[np.maximum(idx, 0)]).astype("timedelta64[D]").astype(float)
    return np.where(idx >= 0, gap, np.inf), np.maximum(idx, 0)


def days_until_notice(filing_dates, notice_dates):
    """Days to the earliest notice strictly after each filing (inf when there is none)."""
    idx = np.searchsorted(notice_dates, filing_dates, side="right")
    safe = np.minimum(idx, len(notice_dates) - 1)
    gap = (notice_dates[safe] - filing_dates).astype("timedelta64[D]").astype(float)
    return np.where(idx < len(notice_dates), gap, np.inf)


def followed_within(notice_dates, filing_dates, days):
    """Per notice: is there a filing 1 to `days` days after it?"""
    first_after = np.searchsorted(filing_dates, notice_dates + np.timedelta64(1, "D"), side="left")
    has = first_after < len(filing_dates)
    nxt = filing_dates[np.minimum(first_after, len(filing_dates) - 1)]
    return has & ((nxt - notice_dates).astype("timedelta64[D]").astype(float) <= days)


def company_sequence(company_notices, company_filings):
    """One company's notices flagged for follow-up, and its filings tagged before/after."""
    ns = company_notices.sort_values("notice_date")
    fs = company_filings.sort_values("received")
    n_dates, f_dates = ns["notice_date"].to_numpy(), fs["received"].to_numpy()
    ns = ns.assign(followed=followed_within(n_dates, f_dates, FOLLOW_DAYS),
                   followed_short=followed_within(n_dates, f_dates, SHORT_DAYS))
    since, idx = days_since_notice(f_dates, n_dates)
    fs = fs.assign(after=since <= FOLLOW_DAYS, after_short=since <= SHORT_DAYS,
                   before=days_until_notice(f_dates, n_dates) <= FOLLOW_DAYS,
                   notice_state=ns["state"].to_numpy()[idx])
    return ns, fs


def not_counted_after(company_notices, not_counted_dates):
    """Not-counted filings received 1 to FOLLOW_DAYS days after any of the company's notices."""
    if len(not_counted_dates) == 0:
        return 0
    n_dates = np.sort(company_notices["notice_date"].to_numpy())
    since, _ = days_since_notice(np.sort(not_counted_dates), n_dates)
    return int((since <= FOLLOW_DAYS).sum())


def company_row(key, ns, fs, not_counted):
    """Company totals per the method's measures 3 to 7."""
    followed = ns[ns["followed"]]
    after = fs[fs["after"]]
    new_employment = int((after["new_employment"].fillna(0) >= 1).sum())
    return {
        "key": key,
        "company": followed["company"].mode().iloc[0] if len(followed) else ns["company"].iloc[0],
        "states": ",".join(sorted(followed["state"].unique())),
        "notices": len(ns),
        "notices_followed": len(followed),
        "workers_laid_off": int(followed["workers"].sum()),
        "first_notice": followed["notice_date"].min(),
        "filings_after": len(after),
        "positions_after": int(after["positions"].sum()),
        "filings_after_90": int(fs["after_short"].sum()),
        "filings_before": int(fs["before"].sum()),
        "filings_after_same_state": int((after["worksite_state"] == after["notice_state"]).sum()),
        "filings_after_new_employment": new_employment,
        "filings_after_change_employer": len(after) - new_employment,
        "filings_after_not_counted": not_counted,
    }


def sequences(notices, lca, not_counted):
    """Per-company rows and all matched notices with follow-up flags."""
    filings_by_key = dict(tuple(lca.groupby("key")))
    not_counted_by_key = {k: g["received"].to_numpy() for k, g in not_counted.groupby("key")}
    rows, flagged = [], []
    for key, company_notices in notices.dropna(subset=["key"]).groupby("key"):
        ns, fs = company_sequence(company_notices, filings_by_key[key])
        flagged.append(ns)
        extra = not_counted_after(ns, not_counted_by_key.get(key, np.array([], dtype="datetime64[ns]")))
        rows.append(company_row(key, ns, fs, extra))
    companies = pd.DataFrame(rows)
    companies = companies[companies["notices_followed"] > 0]
    return companies.sort_values("workers_laid_off", ascending=False), pd.concat(flagged)


def summarize(notices, matched, companies):
    return {
        "notice_start": NOTICE_START.date().isoformat(), "notice_end": NOTICE_END.date().isoformat(),
        "follow_days": FOLLOW_DAYS, "warn_revision": WARN_REVISION,
        "states": int(notices["state"].nunique()),
        "notices_in_window": len(notices),
        "notices_matched": len(matched),
        "notices_followed": int(matched["followed"].sum()),
        "notices_followed_90": int(matched["followed_short"].sum()),
        "companies_followed": len(companies),
        "workers_laid_off": int(companies["workers_laid_off"].sum()),
        "filings_after": int(companies["filings_after"].sum()),
        "positions_after": int(companies["positions_after"].sum()),
        "filings_before": int(companies["filings_before"].sum()),
        "filings_after_same_state": int(companies["filings_after_same_state"].sum()),
        "filings_after_new_employment": int(companies["filings_after_new_employment"].sum()),
        "filings_after_change_employer": int(companies["filings_after_change_employer"].sum()),
        "filings_after_not_counted": int(companies["filings_after_not_counted"].sum()),
    }


def main():
    lca, not_counted = load_filings()
    notices = assign_keys(load_notices(), set(lca["key"]))
    companies, matched = sequences(notices, lca, not_counted)
    summary = summarize(notices, matched, companies)
    for k, v in summary.items():
        log.info(f"{k}: {v:,}" if isinstance(v, int) else f"{k}: {v}")
    with pd.option_context("display.width", 250, "display.max_colwidth", 36):
        log.info(companies.drop(columns=["key"]).head(TOP_COMPANIES).to_string(index=False))
    out = os.path.join(ROOT, "processed", "layoff_filings_companies.parquet")
    companies.to_parquet(out, index=False)
    matched.drop(columns=["key_raw", "key_canon"]).to_parquet(
        os.path.join(ROOT, "processed", "layoff_filings_notices.parquet"), index=False)
    notices_t, months_t = timeline(companies, matched, lca, not_counted)
    notices_t.to_parquet(os.path.join(ROOT, "processed", "layoff_timeline_notices.parquet"), index=False)
    months_t.to_parquet(os.path.join(ROOT, "processed", "layoff_timeline_months.parquet"), index=False)
    if "--load" in sys.argv:
        from layoff_filings_load import load_to_supabase
        load_to_supabase(summary, companies, lca, TOP_COMPANIES)
    if "--load" in sys.argv or "--load-timeline" in sys.argv:
        from layoff_filings_load import load_timeline_to_supabase
        load_timeline_to_supabase(notices_t, months_t)


if __name__ == "__main__":
    configure_logging()
    main()
