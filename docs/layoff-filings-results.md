# Layoffs, then H-1B filings for new workers: results

Method: `docs/layoff-filings-method.md`. Run: `etl/layoff_filings.py`, 2026-10-07.

## Totals

| Measure | First run | Published run (after the amendment) |
|---|---:|---:|
| WARN notices in the window (Oct 1, 2020 to Jun 30, 2025) | 14,436 | 14,753 |
| States | 45 | 45 |
| Notices that match a company with counted H-1B filings | 4,718 | 4,850 |
| Matched notices followed by a counted filing within 365 days | 2,874 | 2,956 (60.9%) |
| The same within 90 days | 1,847 | 1,924 |
| Companies with at least one such notice | 938 | 929 |
| Workers in those notices | 295,397 | 285,788 |
| Counted filings, 1 to 365 days after a notice | 84,684 | 84,720 |
| Positions on those filings | 180,850 | 181,263 |
| Counted filings, 1 to 365 days before a notice | 101,370 | 101,914 |
| Filings after with a worksite in the notice's state | 32,322 | 33,431 (39.5%) |

The first run used the compilation's California rows and kept the HyAxiom notice. The
amendment in the method explains both changes. Neither change moved a headline number by
more than 5%.

**The filings did not stop after the layoffs, but in total they did not rise either.** The
same companies filed 84,720 counted filings in the year after their notices and 101,914 in
the year before.

## Top 20 companies

Ranked by workers in notices that a counted filing followed within 365 days.

| Company (as named in the notice) | States | Workers | Filings after | Within 90 days | Filings before |
|---|---|---:|---:|---:|---:|
| Meta Platforms, Inc. | CA, NJ, NY, WA | 8,068 | 2,764 | 719 | 3,474 |
| Tesla, Inc. | CA, MD, NV, NY, TX | 8,008 | 2,744 | 986 | 2,030 |
| FCA US LLC | MI, OH | 5,821 | 139 | 19 | 146 |
| Microsoft | CA, WA | 5,716 | 5,520 | 1,613 | 8,428 |
| Boeing | AL, CA, CO, FL, LA, MO, VA, WA | 4,692 | 55 | 33 | 48 |
| Jabil Inc. | CA, NM, TX, WA | 4,485 | 93 | 41 | 114 |
| American Airlines, Inc. | AZ, CA, FL, MO, PA | 4,053 | 283 | 48 | 254 |
| Sodexo | 19 states | 3,771 | 37 | 22 | 36 |
| General Motors LLC | KS, MI | 3,643 | 412 | 52 | 294 |
| Intel Corporation | CA, TX | 3,148 | 6,007 | 3,863 | 7,605 |
| Cisco Systems, Inc. | CA | 2,750 | 3,780 | 1,265 | 4,087 |
| Wayfair, LLC | CA, MA | 2,556 | 172 | 22 | 461 |
| Cepheid | CA | 2,530 | 69 | 30 | 163 |
| Qualcomm Incorporated | CA, NJ | 2,356 | 159 | 103 | 207 |
| Bristol Myers Squibb | CA, IL, NJ | 2,107 | 395 | 273 | 436 |
| Genpact LLC | CA, CT, FL, IL, OH, TX | 2,089 | 777 | 475 | 962 |
| Google | CA, NY | 2,030 | 11,926 | 9,811 | 17,065 |
| Tyson Foods | FL, IL, IN, MO, SD, VA | 2,019 | 51 | 21 | 54 |
| Pitney Bowes Inc. | 9 states | 1,956 | 44 | 20 | 67 |
| Charter Communications | 9 states | 1,930 | 454 | 193 | 641 |

Five of these 20 companies filed more counted filings in the year after their notices than
in the year before: Tesla, Boeing, American Airlines, Sodexo, and General Motors.

## Verification

For each company, we checked the notice with the most workers (method, "Verification").
California notices are read straight from the EDD reports, so they are checked by
construction.

| Company | State | Notice date | Workers | Official source | Result |
|---|---|---|---:|---|---|
| Meta Platforms | NY | 2022-11-09 | 871 | NY DOL WARN PDF | Confirmed |
| Tesla | TX | 2024-04-23 | 2,688 | data.texas.gov `8w53-c4f6` | Confirmed |
| FCA US | MI | 2023-12-07 | 2,453 | michigan.gov/leo WARN | Confirmed |
| Microsoft | WA | 2025-05-13 | 1,985 | WA ESD WARN database (received date) | Confirmed |
| Boeing | WA | 2024-11-15 | 2,192 | WA ESD WARN database (received date) | Confirmed |
| Jabil | CA | 2023-09-21 | 550 | EDD report 2023-24 | Confirmed |
| American Airlines | MO | 2021-02-08 | 1,173 | jobs.mo.gov WARN 2021 | Confirmed |
| Sodexo | LA | 2025-05-16 | 881 | laworks.net WARN PDF | Confirmed |
| General Motors | KS | 2024-09-19 | 1,695 | kansasworks.com | Confirmed |
| Intel | CA | 2024-10-15 | 272 | EDD report 2024-25 | Confirmed |
| Cisco Systems | CA | 2024-09-13 | 563 | EDD report 2024-25 | Confirmed |
| Wayfair | MA | 2024-01-19 | 936 | mass.gov WARN | Confirmed |
| Cepheid | CA | 2022-08-16 | 632 | EDD report 2022-23 | Confirmed |
| Qualcomm | CA | 2023-10-11 | 1,064 | EDD report 2023-24 | Confirmed |
| Bristol Myers Squibb | NJ | 2024-05-01 | 776 | NJ DOL 2024 WARN archive (month posted) | Confirmed |
| Genpact | TX | 2023-01-19 | 964 | data.texas.gov `8w53-c4f6` | Confirmed |
| Google | NY | 2023-01-20 | 887 | NY DOL WARN PDF 2022-0087 | Confirmed |
| Tyson Foods | VA | 2023-03-13 | 612 | virginiaworks.gov WARN | Confirmed |
| Pitney Bowes | NJ | 2024-08-01 | 413 | NJ DOL 2024 WARN archive (month posted) | Confirmed |
| Charter Communications | NY | 2023-07-26 | 273 | NY DOL WARN PDF 2023-0022 | Confirmed |

All 20 confirmed: the company, worker count, and date match the state's own records. NJ
shows only the month posted, so for NJ the day was not checked.

Found at verification and handled by the amendment:

- **California dates.** The compilation's California `notice_date` is mostly EDD's
  received date. California now comes from the EDD reports.
- **HyAxiom, CT.** The compilation shows 4,918 workers. Press reports give 67. The notice is
  dropped.
- **Washington dates.** ESD publishes only the date it received a notice. The compilation
  uses that date as the notice date. We keep it and say so in the limits.
