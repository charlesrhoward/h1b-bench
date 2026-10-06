# Who sets the H-1B wage floor: method

**Status: fixed before any results were computed.** This file is committed on its own,
ahead of the code and output that use it.

## Question

Each H-1B filing states where its wage floor (prevailing wage) came from. When employers
choose a private salary survey instead of government data, is the pay on those filings
lower relative to the local median?

## Source

DOL OFLC LCA disclosure files, FY2025 (all four quarters), certified H-1B filings. The
columns used are `PW_TRACKING_NUMBER`, `PW_OES_YEAR`, `PW_OTHER_SOURCE`, and
`PW_SURVEY_PUBLISHER`.

## Classification (first rule that applies)

1. `PW_TRACKING_NUMBER` present: **DOL determination** (DOL set the wage on request).
2. `PW_OES_YEAR` present: **Government data (OEWS)** from the OFLC wage library.
3. `PW_OTHER_SOURCE` = Survey: **Private survey**, chosen by the employer.
4. `PW_OTHER_SOURCE` = CBA: **Union contract**.
5. `PW_OTHER_SOURCE` = DBA or SCA: **Federal contract wage**.
6. Anything else: **Other**.

## Measures (all reported)

Per source, and per source × DOL "H-1B dependent" status:

1. Filings.
2. Share of filings at wage Level I or II.
3. Share of matched filings that offer less than the local median. This reuses the
   market-gap match from [market-gap-method.md](market-gap-method.md), joined by case
   number.

Also reported: the survey publishers with the most filings. Publisher names are grouped by
firm name (for example "Willis Towers Watson Data Services, Inc." and "Towers Watson" are
grouped as Willis Towers Watson). The grouping list is in `etl/pw_source.py`.

## Known limits

- The source is the employer's own entry on the filing.
- A private survey can be lawful and accurate. This measures outcomes; it does not judge
  any single survey.
- The local-median comparison covers only filings that matched in the market-gap method.
