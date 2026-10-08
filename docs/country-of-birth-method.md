# Approved H-1B petitions by country of birth: method

**Status: written after the first parse.** The parser ran once to test that it could read
the source tables. This file then fixed the method. The numbers it reports are copied from
the source; this method adds only shares of each year's total.

## Question

In each fiscal year, where were the workers born whose H-1B petitions USCIS approved? How
much of the program goes to workers born in one or two countries?

## Source

The USCIS reports to Congress, "Characteristics of H-1B Specialty Occupation Workers",
one per fiscal year, from uscis.gov/tools/reports-and-studies. The file names are in the
docstring of `etl/country_of_birth.py`.

The table used is "H-1B Petitions by Place of Birth ... All Petitions Approved": Table 4a
in the FY2020 to FY2024 reports, and Table 1a in the FY2025 report. The column used is the
"All Beneficiaries" (Total) number. It counts approved petitions for initial employment and
for continuing employment together.

## Population

All H-1B petitions that USCIS approved in federal fiscal years 2020 to 2025 (October 1 to
September 30). USCIS counts a petition in the year of its first approval decision, even if
it was filed in an earlier year (report footnote, FY2024 Section 2.2).

## Measures

1. **Approved petitions by place of birth, by year**, as USCIS printed them.
2. **Total approved petitions per year**: the sum of every row of the table, the "Unknown"
   row included.
3. **Share**: one country's approved petitions divided by that year's total.

## Parsing

- The tables are PDF text. Long place names wrap onto two or three lines. In each report
  the numbers of a wrapped cell sit on one fixed line of it: the last line (FY2020,
  FY2022), the first line (FY2021, FY2023), or the middle line (FY2024). The parser joins
  name fragments by that rule for each year. FY2025 has no wrapped names.
- Place names get one spelling across years. The parser sets the same capital letters (the
  FY2025 report prints names in capitals) and removes accents (FY2025 prints "Curacao", the
  earlier reports "Curaçao"). One label changed for the same place: "British Virgin
  Islands" (FY2020) is counted as "Virgin Islands, British". Other labels stay as printed.
  For example, "Palestine (Born before 1948)" and "Palestine, State of" are different rows
  in the source and stay different here.
- **Check.** For each year, the parser stops with an error unless the country rows sum to
  the table's own "Total" row. All six years pass.
- The FY2022 "Total" row (441,502) leaves out that year's 541 "Unknown" petitions. The
  other years include them. This method uses the full sum (442,043) for FY2022. The FY2023
  report gives the same number for FY2022 approvals.

## Results (first parse)

| Fiscal year | Approved petitions | India | China | All other places |
|---|---:|---:|---:|---:|
| 2020 | 426,710 | 74.9% | 12.1% | 13.0% |
| 2021 | 407,071 | 74.1% | 12.4% | 13.5% |
| 2022 | 442,043 | 72.6% | 12.5% | 15.0% |
| 2023 | 386,318 | 72.3% | 11.7% | 15.9% |
| 2024 | 399,378 | 71.0% | 11.7% | 17.3% |
| 2025 | 406,348 | 69.9% | 12.1% | 18.0% |

Each share is rounded on its own, so a row can miss 100% by 0.1. Rerun
`./venv/bin/python -u etl/country_of_birth.py` to print the full table.

## Known limits

- **Petitions, not people.** One worker can have more than one approved petition in a year
  (for example, a new employer or an extension). The counts are not a count of workers.
- **Initial and continuing together.** Most approvals are for continuing employment:
  extensions, amendments, and changes of employer for people who already hold H-1B status
  (65% in FY2024, 72% in FY2025). The mix of new workers is different. In FY2025, India was
  50.3% and China 15.4% of the 114,806 initial-employment approvals (Table 1b), and India
  was 77.6% of the 291,542 continuing-employment approvals (Table 1c).
- **Country of birth, not citizenship.** USCIS reports place of birth. A worker born in one
  country can be a citizen of another.
- **The appendix table and the report's own top-ten figure do not agree exactly.** For
  example, FY2024 India is 283,755 in Table 4a and 283,397 in Figure 5. FY2025 India is
  284,106 in Table 1a and 283,772 in Figure 1. The FY2024 table total (399,378) is 17 less
  than the approvals the FY2024 report gives in its text (399,395). This method uses the
  appendix tables only. No share in the results changes by more than 0.1 percentage point
  if the figure numbers are used instead.
- **Approvals only.** The reports do not give denials by country of birth.
- **USCIS data quality.** The reports say that some values come from data entry and can be
  wrong, and that bad values are set to "Unknown" (Appendix B of each report).
- **Not the same data as the rest of H1B Bench.** The LCA numbers elsewhere on the site are
  Department of Labor filings. An LCA has no country of birth. These USCIS counts cannot be
  joined to an employer or an LCA.
