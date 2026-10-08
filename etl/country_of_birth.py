"""Approved H-1B petitions by beneficiary country of birth, per docs/country-of-birth-method.md.

Inputs (data/raw/uscis_characteristics/), the USCIS reports to Congress "Characteristics of
H-1B Specialty Occupation Workers" (uscis.gov/tools/reports-and-studies):
  fy2020.pdf  reports/Characteristics_of_Specialty_Occupation_Workers_H-1B_Fiscal_Year_2020.pdf
  fy2021.pdf  data/H1B_Characteristics_Congressional_Report_FY2021-3.2.22.pdf
  fy2022.pdf  data/OLA_Signed_H-1B_Characteristics_Congressional_Report_FY2022.pdf
  fy2023.pdf  reports/OLA_Signed_H-1B_Characteristics_Congressional_Report_FY2023.pdf
  fy2024.pdf  reports/ola_signed_h1b_characteristics_congressional_report_FY24.pdf
  fy2025.pdf  data/fy25_h1b_characteristics_congress_signed_04242026.pdf
(each path is under uscis.gov/sites/default/files/document/)

The table read is "H-1B Petitions by Place of Birth ... All Petitions Approved" (Table 4a in
FY2020-FY2024, Table 1a in FY2025). Its "All Beneficiaries" number column is the count.
Long country names wrap onto extra lines. Each report puts the numbers of a wrapped cell
on one fixed line of it (NUMBERS_LINE), so each name fragment joins the number line that
its year's layout gives. The parse fails unless the country rows of each year sum to that
year's published "Total" row.

  ./venv/bin/python -u etl/country_of_birth.py              # parse + print
  (cd etl && SUPABASE_URL=... SUPABASE_KEY=... ../venv/bin/python -u country_of_birth.py --load)

--load needs the temporary insert policies from etl/schema.sql; truncate both tables first
on a refresh.
"""
import logging
import os
import re
import sys
import unicodedata

import pandas as pd
import pdfplumber
from cli_log import configure_logging

log = logging.getLogger(__name__)

RAW = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "uscis_characteristics")
YEARS = range(2020, 2026)
TABLE_START = re.compile(r"^Table (4a|1a)\. H-1B Petitions by Place of Birth")
TABLE_END = re.compile(r"^Note: Sum of percentages")
HEADER = re.compile(
    r"^(Table \d|Gender$|All Beneficiaries$|Initial Employment$|Place of Birth|Number Percent|"
    r"Female Female|Department of Homeland Security|Source:|\d+$)"
)
NUMBER = re.compile(r"^\d[\d,]*(\.\d+)?$")
SMALL_WORDS = {"and", "of", "the", "before", "da", "de"}
# The same place under two labels. Other label changes (for example the Palestine rows)
# are different categories in the source and stay apart.
ALIASES = {"British Virgin Islands": "Virgin Islands, British"}
# Which line of a wrapped country cell holds the numbers. FY2025 wraps no names.
NUMBERS_LINE = {2020: "last", 2021: "first", 2022: "last", 2023: "first", 2024: "middle", 2025: "last"}


def numbers_per_row(year):
    """FY2025 dropped the sex columns: Total Number, Total Percent only."""
    return 2 if year >= 2025 else 8


def pdf_lines(path):
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            yield from (line["text"].strip() for line in page.extract_text_lines())


def table_lines(path):
    """Every line inside the all-approvals place-of-birth table, in reading order."""
    inside = False
    for text in pdf_lines(path):
        if TABLE_START.match(text):
            inside = True
        elif inside and TABLE_END.match(text):
            return
        elif inside and not HEADER.match(text):
            yield text


def split_row(text, width):
    """(name part, numbers) when the line ends in `width` numbers, else (text, None)."""
    tokens = text.split()
    if len(tokens) < width or not all(NUMBER.match(t) for t in tokens[-width:]):
        return text, None
    return " ".join(tokens[:-width]), [t.replace(",", "") for t in tokens[-width:]]


def attach_last(items):
    """Numbers on the last line: fragments open the next number line's name."""
    pending = []
    for item in items:
        if isinstance(item, str):
            pending.append(item)
        else:
            item["parts"] = [*pending, *item["parts"]]
            pending = []
    if pending:
        raise ValueError(f"name fragments {pending} after the last number line")


def attach_first(items):
    """Numbers on the first line: fragments close the previous number line's name."""
    last = None
    for item in items:
        if not isinstance(item, str):
            last = item
        elif last is None:
            raise ValueError(f"name fragment {item!r} before the first number line")
        else:
            last["parts"].append(item)


def attach_middle(items):
    """Numbers on the middle line: a wrapped cell reads fragment, number line, fragment."""
    i = 0
    while i < len(items):
        if not isinstance(items[i], str):
            i += 1
            continue
        window = items[i:i + 3]
        if len(window) < 3 or isinstance(window[1], str) or not isinstance(window[2], str):
            raise ValueError(f"name fragment {items[i]!r} is not around one number line")
        window[1]["parts"] = [window[0], *window[1]["parts"], window[2]]
        i += 3


ATTACH = {"last": attach_last, "first": attach_first, "middle": attach_middle}


def parse_year(year):
    """Country rows and the published total for one fiscal year."""
    items = []
    for text in table_lines(os.path.join(RAW, f"fy{year}.pdf")):
        name, nums = split_row(text, numbers_per_row(year))
        items.append(text if nums is None else {"parts": [name], "approved": int(nums[-2])})
    ATTACH[NUMBERS_LINE[year]](items)
    rows = [item for item in items if not isinstance(item, str)]
    for row in rows:
        row["country"] = canonical_name(" ".join(p for p in row["parts"] if p))
    return check_total(year, rows)


def canonical_name(raw):
    """One spelling per country across years: FY2025 prints names in capitals, without accents."""
    plain = unicodedata.normalize("NFKD", raw).encode("ascii", "ignore").decode()
    words = re.sub(r"\s+", " ", plain).strip().lower().split(" ")
    name = " ".join(
        w if i and w in SMALL_WORDS else re.sub(r"(^|[(\-'])([a-z])", lambda m: m[1] + m[2].upper(), w)
        for i, w in enumerate(words)
    )
    return ALIASES.get(name, name)


def check_total(year, rows):
    """Country rows and their sum, which must equal the published Total row.

    The FY2022 Total row leaves out the "Unknown" row; every other year includes it. The
    sum of all rows is the year's count of approved petitions in both cases (the FY2023
    report gives FY2022 approvals as 442,043, the FY2022 sum with "Unknown").
    """
    totals = [r["approved"] for r in rows if r["country"] == "Total"]
    countries = pd.DataFrame(
        [{"fiscal_year": year, "country": r["country"], "approved": r["approved"]} for r in rows
         if r["country"] != "Total"]
    )
    if len(totals) != 1:
        raise ValueError(f"FY{year}: expected one Total row, found {len(totals)}")
    if countries["country"].duplicated().any():
        dupes = countries.loc[countries["country"].duplicated(), "country"].tolist()
        raise ValueError(f"FY{year}: duplicate countries {dupes}")
    summed = int(countries["approved"].sum())
    unknown = int(countries.loc[countries["country"] == "Unknown", "approved"].sum())
    if totals[0] not in (summed, summed - unknown):
        raise ValueError(f"FY{year}: country rows sum to {summed:,}, published Total is {totals[0]:,}")
    if totals[0] != summed:
        log.info(f"FY{year}: published Total {totals[0]:,} leaves out {unknown:,} Unknown")
    return countries, summed


def parse_all():
    frames, years = [], []
    for year in YEARS:
        countries, total = parse_year(year)
        frames.append(countries)
        years.append({"fiscal_year": year, "approved": total, "countries": len(countries)})
        log.info(f"FY{year}: {len(countries)} places of birth, {total:,} approved petitions")
    return pd.concat(frames, ignore_index=True), pd.DataFrame(years)


def log_single_year_names(countries):
    """List names seen in one fiscal year only. A wrong fragment join changes a name but not
    the sums, so check_total cannot catch it; a one-year name is where it would show."""
    seen = countries.groupby("country")["fiscal_year"].agg(["nunique", "first"])
    single = seen[seen["nunique"] == 1]
    for name, row in single.iterrows():
        approved = countries.loc[countries["country"] == name, "approved"].iloc[0]
        log.info(f"only in FY{row['first']}: {name} ({approved:,}); check the PDF if the name looks wrong")


def share_table(countries, years, top=8):
    latest = countries[countries["fiscal_year"] == max(YEARS)]
    leaders = latest[latest["country"] != "Unknown"].nlargest(top, "approved")["country"]
    pivot = countries[countries["country"].isin(leaders)].pivot(
        index="country", columns="fiscal_year", values="approved")
    return (pivot / years.set_index("fiscal_year")["approved"] * 100).round(1).loc[leaders]


def main():
    countries, years = parse_all()
    log_single_year_names(countries)
    with pd.option_context("display.width", 200):
        log.info(years.to_string(index=False))
        log.info("share of approved petitions (%):\n" + share_table(countries, years).to_string())
    if "--load" not in sys.argv:
        return
    from load_supabase import post_batch, records
    post_batch("uscis_birth_country_years", records(years, ["fiscal_year", "approved", "countries"]))
    post_batch("uscis_birth_country", records(countries, ["fiscal_year", "country", "approved"]))
    log.info(f"loaded {len(years)} years, {len(countries):,} country rows")


if __name__ == "__main__":
    configure_logging()
    main()
