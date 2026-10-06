# Layoff notices from H-1B employers: method

**Status: fixed before any results were computed.** This file is committed on its own,
ahead of the code and output that use it.

## Question

Which employers filed mass-layoff (WARN) notices in the same period in which they had
H-1B filings certified, and how many workers did those notices cover?

## Sources

| Data | Source | Window used |
|------|--------|-------------|
| H-1B filings | DOL OFLC LCA disclosure data, certified H-1B, FY2025 | Oct 1, 2024 to Sep 30, 2025 |
| Texas WARN notices | Texas Workforce Commission, data.texas.gov dataset `8w53-c4f6` | notice date Oct 1, 2024 to Sep 30, 2025 |
| California WARN notices | California EDD, WARN report for 7/1/2024 to 6/30/2025 (PDF) | notice date Oct 1, 2024 to Jun 30, 2025 |

California's report for July to September 2025 is not published as a data file, so
California covers 9 of the 12 months. Texas and California are the two states with the
most H-1B filings among the states that publish WARN data in a usable form.

## Company matching

Both sides get a company key: the `norm_name` normalization used for LCA employers, then
any text after " DBA " is removed, then trailing legal-form words are removed until none
remain (INC, INCORPORATED, LLC, L L C, CORP, CORPORATION, CO, COMPANY, LTD, LIMITED, LP,
LLP, PLLC, PC), and a leading THE is removed. A WARN notice matches when its company key
exactly equals the key of an employer with certified FY2025 H-1B filings. Fuzzy matching is
not used.

## Measures

1. Companies with at least one WARN notice in the window and at least one certified FY2025
   H-1B filing.
2. Workers covered by those companies' WARN notices.
3. Those companies' certified FY2025 H-1B filings.
4. The 20 matched companies with the most workers in WARN notices.

## Known limits

- WARN notices do not list jobs. A layoff can be in different roles than the H-1B filings.
- WARN applies to larger layoffs only (generally 50+ workers at one site), so smaller
  layoffs are not counted.
- Two states only, and 9 months for California.
- Exact key matching misses notices filed under a site or brand name.
