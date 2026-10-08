# H-1B pay vs. local median pay: method

**Status: fixed before any results were computed.** This file is committed on its own,
ahead of the code and output that use it.

## Question

How does the pay offered on H-1B filings compare with the local median pay for the same
occupation in the same area?

## Sources

| Side | Source |
|------|--------|
| Offered pay | DOL OFLC LCA disclosure data, FY2025, certified H-1B filings: `WAGE_RATE_OF_PAY_FROM` |
| Local median | DOL OFLC Online Wage Library (flag.dol.gov), All Industries file (`ALC_Export.csv`), **Level III** wage: the 50th percentile of local pay for the occupation, from BLS OEWS data |
| Area | OFLC `Geography.csv`: county (or New England town) to OEWS area |

## Population

FY2025 certified H-1B filings that meet all of these:

- `WAGE_UNIT_OF_PAY` is Year (so no hours assumption is needed for the offer),
- full-time position,
- worksite county and state match one OFLC area,
- the job's 6-digit SOC code has an All Industries wage row for that area.

The match rate is published with the result.

## Matching rules

- **Wage year:** OFLC wage years run July 1 to June 30. A filing uses the wage year that
  contains its `RECEIVED_DATE` (2024-25 or 2025-26).
- **Area:** the worksite county name and state are normalized (uppercase; the words
  COUNTY, PARISH, BOROUGH, CENSUS AREA, MUNICIPALITY, CITY AND BOROUGH and punctuation are
  removed; SAINT becomes ST) and matched to `Geography.csv`. No fuzzy matching is used.
- **Local median:** Level III hourly wage × 2,080 hours. Rows that `ALC_Export.csv` labels
  "Annual Wage" (mostly teaching occupations, SOC 25-) already give yearly pay, so they are
  used as they are. See "Corrections".

## Measures (all reported, none dropped)

1. **Share below the local median:** filings whose offered yearly pay is less than the
   local median.
2. **Median gap:** the median of (offered pay − local median), in dollars, for all filings
   and for filings below the median.
3. Both measures split by DOL "H-1B dependent" status.

## Known limits

- Level III is DOL's 50th-percentile wage, computed from OEWS. It is not a fresh survey of
  the employer's own staff.
- Offered pay is the bottom of the offered range (`WAGE_RATE_OF_PAY_FROM`). An employer can
  pay more.
- OEWS wages describe all workers in the occupation and area, at all experience levels.
- Filings that cannot be matched to an area or wage row are left out. They are not counted
  as above or below.
- **DOL left the worksite county blank in most of its FY2025 Q4 file.** Of the 103,285
  certified H-1B filings in that file, 91,706 (88.8%) have no county. In Q1 to Q3, none are
  blank. These filings cannot match an area, so most Q4 filings are not in the result.

## Corrections

- **2026-10-07: yearly wage rows.** The first run multiplied every Level III wage by 2,080
  hours. The wage library gives some occupations a yearly wage (label "Annual Wage"), so
  14,417 of the 404,917 matched filings got a local median near $300 million. Each of them
  counted as below the median. The fixed run uses those wages as they are. The matched count
  did not change. All filings: below the local median went from 57.1% to 55.8%, and the
  median gap went from −$6,834 to −$4,427. Not H-1B dependent: 53.0% to 51.3%, gap −$960 to
  $0. H-1B dependent: 70.0% to 69.9%. The wage-floor finding (`docs/pw-source-method.md`)
  reuses this match: union-contract floors went from 92.7% to 77.5% below the median, and
  OEWS floors from 55.3% to 54.1%. Reloaded tables: `market_gap_summary`,
  `employer_market_gap`, `pw_source_summary`, `pw_survey_publishers`.
