"""California WARN notices from the EDD yearly WARN reports (PDF), per docs/layoff-filings-method.md.

Inputs (data/raw/), each from edd.ca.gov/siteassets/files/jobs_and_training/warn/:
  ca_warn_2020-21.pdf   warn-report-for-7-1-2020-to-06-30-2021.pdf
  ca_warn_2021-22.pdf   warn-report-for-7-1-2021-to-06-30-2022.pdf
  ca_warn_2022-23.pdf   warn-report-for-7-1-2022-to-06-30-2023.pdf
  ca_warn_2023-24.pdf   warn-report-for-7-1-2023-to-06-30-2024.pdf
  ca_warn_2024-25.pdf   warn-report-for-7-1-2024-to-06-30-2025.pdf

The column order differs between years, so rows are read by header name. EDD lists one
row per affected site, so one notice letter can be several rows. Rows that repeat every
field are dropped once.
"""
import glob
import logging
import os
import re

import pandas as pd
import pdfplumber

log = logging.getLogger(__name__)

ROOT = os.path.join(os.path.dirname(__file__), "..", "data")
DATE_CELL = re.compile(r"\d{2}/\d{2}/\d{4}")


def clean_row(row):
    return [re.sub(r"\s+", " ", cell or "").strip() for cell in row]


def table_rows(pdf):
    """Every cleaned table row of every page, in order."""
    for page in pdf.pages:
        yield from map(clean_row, page.extract_table() or [])


def file_rows(path):
    """Notice rows of one report as dicts keyed by that report's header names."""
    rows, header = [], None
    with pdfplumber.open(path) as pdf:
        for row in table_rows(pdf):
            if row and row[0] == "Notice Date":
                header = row
            elif header and row and DATE_CELL.fullmatch(row[0]):
                rows.append(dict(zip(header, row, strict=False)))
    log.info(f"{os.path.basename(path)}: {len(rows):,} notices")
    return rows


def load_ca_notices():
    """All EDD report rows in the notice schema used by layoff_filings.py."""
    rows = []
    for path in sorted(glob.glob(os.path.join(ROOT, "raw", "ca_warn_20*.pdf"))):
        rows.extend(file_rows(path))
    df = pd.DataFrame(rows)
    df = df.drop_duplicates(subset=[c for c in df.columns if c != "Received Date"])
    log.info(f"CA notices after dropping exact duplicate rows: {len(df):,}")
    return pd.DataFrame({
        "id": "ca-edd-" + df.index.astype(str),
        "state": "CA",
        "company": df["Company"],
        "company_canonical": None,
        "location": df["County"],
        "employees_affected": pd.to_numeric(df["No. Of Employees"].str.replace(",", ""), errors="coerce"),
        "notice_date": pd.to_datetime(df["Notice Date"], format="%m/%d/%Y", errors="coerce"),
        "notice_type": df["Layoff/Closure Type"],
    })
