# H-1B back wages from DOL enforcement: method

**Status: fixed before any results were computed.** This file is committed on its own,
ahead of the code and output that use it.

## Question

How much in H-1B back wages has the DOL Wage and Hour Division (WHD) found that employers
owe, to how many workers, and which employers?

## Source

DOL WHD concluded compliance actions (data.dol.gov, `WHD_enforcement.zip`, all concluded
cases since FY2005). The columns used are `CASE_ID`, `LEGAL_NAME`, `TRADE_NM`, `ST_CD`,
`FINDINGS_END_DATE`, `H1B_VIOLTN_CNT`, `H1B_BW_ATP_AMT` (back wages the employer agreed to
pay), `H1B_EE_ATP_CNT` (employees owed back wages), and `H1B_CMP_ASSD_AMT` (civil money
penalties assessed).

## Population

Cases with `H1B_VIOLTN_CNT > 0` or `H1B_BW_ATP_AMT > 0`.

## Measures

1. **By year**, using the federal fiscal year of `FINDINGS_END_DATE`: H-1B cases, back
   wages, employees owed, and penalties.
2. **Totals** across all years.
3. **Employers with the most H-1B back wages**, named as in the WHD record (legal name, or
   trade name if the legal name is blank).

## Matching to H1B Bench employers

A WHD case links to an H1B Bench employer when its normalized legal name or trade name
exactly equals the employer's normalized name. Normalization is the same function used
for LCA employers (`norm_name` in `etl/load_supabase.py`). Fuzzy matching is not used.
Unlinked cases still count in the totals.

## Known limits

- WHD investigates a small share of employers. Cases measure enforcement, not the full
  rate of violations.
- The dataset holds concluded cases only, so recent years are incomplete.
- Back wages are amounts the employer agreed to pay. The data does not show if the
  employer paid.
- Exact-name linking misses employers whose names differ between the WHD and LCA records.
- Yearly rows and the all-years totals count only cases with a findings date
  (`FINDINGS_END_DATE`). Added after code review: the first run had 1 undated H-1B case,
  with $208,052 in back wages.
