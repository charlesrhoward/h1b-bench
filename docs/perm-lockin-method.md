# Green card filings: job already filled, prior layoffs, DOL wait: method

**Status: fixed before any results were computed.** This file is committed on its own,
ahead of the code and output that use it.

## Question

A green card through a job (PERM, Form ETA-9089) requires the employer to test the U.S.
labor market for the job. While the case is open, the worker cannot easily change
employers without starting over. For PERM decisions in FY2025:

1. How often was the job already held by the foreign worker the employer sponsors?
2. How often did the employer report a layoff in the same occupation and area in the
   six months before the filing, and which employers did this most?
3. How long did the DOL step take?

## Source

DOL OFLC PERM disclosure data, FY2025 (`PERM_Disclosure_Data_FY2025_Q4.xlsx`): cases with
a DOL decision from October 1, 2024 to September 30, 2025. The FY2026 file is not used, so
the year is complete and matches the other sections of /pay-vs-market.

Columns, as named in the file:

| Column | Form question (paraphrased) |
|--------|-----------------------------|
| `OTHER_REQ_IS_FW_CURRENTLY_WRK` | Is the foreign worker currently employed by the employer? |
| `OTHER_REQ_EMP_LAYOFF` | Did the employer have a layoff in the area of intended employment, in the occupation or a related occupation, in the 6 months before filing? |
| `RECEIVED_DATE`, `DECISION_DATE` | DOL receipt and decision dates |
| `CASE_STATUS`, `EMP_BUSINESS_NAME` | Outcome and employer |

## Rules

- "Certified" means `CASE_STATUS` is Certified or Certified - Expired (the certification
  was issued; Expired means it later lapsed unused). Withdrawn cases are excluded from all
  measures. Denied cases are counted only where a measure names them.
- Duplicate case numbers are dropped (first row kept).
- Employers are grouped by the `norm_name` normalization of `EMP_BUSINESS_NAME` used for
  all employers on this site, and linked to an employer page when that name matches.

## Measures

1. Share of certified filings where the worker already works for the employer
   (`OTHER_REQ_IS_FW_CURRENTLY_WRK` = Y), overall and for professional occupations.
2. Certified filings where the employer reported a layoff (`OTHER_REQ_EMP_LAYOFF` = Y):
   count, share of certified filings, and the 15 employers with the most such filings.
3. Days from `RECEIVED_DATE` to `DECISION_DATE` for certified filings: median and 90th
   percentile.

## Known limits

- The PERM file does not show the worker's visa status, so it cannot show how many
  workers are on H-1B.
- Both answers are the employer's own entries on the form.
- A layoff answer of Y is lawful if the employer notified and considered the laid-off
  workers. The data does not show that step or its result.
- The wait is the DOL step only. The full green card wait also includes USCIS steps and,
  for some countries, years in the visa queue.

## Corrections

- After code review: Question 2 above says "the same occupation and area". The form asks
  about the occupation or a related occupation (see the Source table). The page copy uses
  the form's wording.
