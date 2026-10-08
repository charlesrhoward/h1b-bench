# Layoffs, then H-1B filings for new workers: method

**Status: fixed before any results were computed.** This file is committed on its own,
ahead of the code and output that use it. It replaces the same-year comparison in
`docs/warn-method.md` as finding 6 on `/pay-vs-market`.

## Question

After a company filed a mass-layoff (WARN) notice, did it file for H-1B workers who were
new to the company within the next 12 months? How many, and how does that compare with
the 12 months before the notice?

## Sources

| Data | Source | Window used |
|------|--------|-------------|
| H-1B filings | DOL OFLC LCA disclosure data, FY2020 through FY2026 Q3 | received Oct 1, 2019 to Jun 30, 2026 |
| WARN notices | `APProjects/us-warn-act-layoffs-notices-daily` on Hugging Face, CC BY 4.0, revision `5c98e601843f08a1a3ec5b91f7e60a9701b784d1` (rebuilt 2026-09-25) | notice date Oct 1, 2020 to Jun 30, 2025 |

The WARN file is a compilation, not a government file. It collects the notices that 48
state and D.C. labor agencies publish (scraped with the open-source
`biglocalnews/warn-scraper`, plus notices recovered from archived copies of retired agency
pages). Each row keeps its state. Before we publish, we check the notices of the 20
companies in the results table against the official state portals (see "Verification").
We do not use Quiver Quantitative: its layoff data is a paid API with reuse terms.

The notice window starts Oct 1, 2020 so that every notice has 12 months of LCA data
before it. It ends Jun 30, 2025 so that every notice has 12 months of LCA data after it.

## H-1B filings that count

A filing counts when all of these are true:

- Visa class is H-1B and case status is Certified.
- It asks for at least one worker who is new to the company: `NEW_EMPLOYMENT` plus
  `CHANGE_EMPLOYER` is 1 or more. Extensions, amendments, and concurrent jobs for
  current workers do not count.

"Positions" is the sum of `NEW_EMPLOYMENT` and `CHANGE_EMPLOYER` on those filings. It is
the maximum number of new workers the filings allow, not the number hired.

The date of a filing is its `RECEIVED_DATE`, the date the employer submitted it.

## Company matching

Both sides get the company key from `docs/warn-method.md` (`company_key` in
`etl/warn.py`): name normalized, text after " DBA " removed, trailing legal-form words
removed, leading THE removed. A WARN notice matches a company when the key of its
`company` field, or the key of its `company_canonical` field, exactly equals the key of an
employer name on a counted H-1B filing. Fuzzy matching and ticker roll-ups are not used.
Notices without a notice date are dropped and counted.

## Measures

For each notice, "after" means filings received 1 to 365 days after the notice date, and
"before" means filings received 1 to 365 days before it. A company's totals count each
filing once, even when it falls after more than one of the company's notices.

1. Notices in the window (with a notice date), and how many match a company.
2. Matched notices followed by at least one counted filing within 365 days. The same
   within 90 days, as a secondary cut.
3. Companies with at least one such notice, the workers in those notices, and the counted
   filings and positions in the 365 days after those notices.
4. For each of those companies: counted filings in the 365 days before its notices,
   compared with the 365 days after.
5. The 20 companies with the most workers in WARN notices that were followed by counted
   filings, with notices, workers, filings and positions after, filings within 90 days,
   and filings before.
6. Of the filings after, how many list a worksite in the same state as the notice.

## Verification

For each of the 20 companies in the results table, we look up at least one notice on the
official state portal and confirm the company, date, and worker count. If a notice does
not appear on the state's portal or in the agency's archived pages, we drop it and say so
in `docs/layoff-filings-results.md`.

## Known limits

- An LCA certification is a filing step. It is not a visa, a hire, or a petition approval.
- WARN notices do not list jobs. The new H-1B filings can be for different roles, sites, or
  business units than the layoff.
- The sequence does not show that one group replaced the other. Large employers file for
  H-1B workers all year, so measure 4 shows the filings before the notice as well.
- WARN applies to larger layoffs only (generally 50+ workers at one site). Some states do
  not publish a notice date, and those notices are dropped.
- The WARN file is a third-party compilation of state records.
- Exact key matching misses notices filed under a site, brand, or subsidiary name, so
  these counts are lower than the true totals.

## Amendment, 2026-10-07: changes made at verification, before publication

These changes were made after the first results were computed, during the verification step,
and before anything was published. The first run's totals are in
`docs/layoff-filings-results.md`, so the effect of each change is visible.

1. **California comes from the EDD reports, not the compilation.** Verification showed that
   for most California rows, the compilation's `notice_date` is the date EDD *received* the
   notice, not the notice date. The lag is a median of 5 to 30 days, depending on the year,
   and sometimes months (Grand Hyatt San Diego: notice dated Jun 29, 2020, received Oct 2,
   2020). Since timing is the point of this finding, California notices now come from the five
   EDD yearly WARN reports (Jul 2020 to Jun 2025, `etl/ca_warn.py`) and use their Notice Date
   column. The compilation's California rows are not used. EDD lists one row per affected
   site, so in California one notice letter can be several rows. Rows that repeat every field
   (15 rows) are dropped once. California's report for Jul 2025 to Jun 2026 is not
   published as a data file, so a California notice dated before Jul 1, 2025 that EDD
   received after that date is missed.
2. **One notice is dropped.** HyAxiom (CT, Nov 14, 2024) shows 4,918 workers. Press reports
   of the same notice give 67 (49 and 18 at two sites). The CT DOL site blocks automated
   requests, so we could not check it there. We drop the notice. We do not correct it.
3. **California matching uses the raw company name only.** The EDD reports have no
   canonical name column.
4. **Some states give a received date.** Washington ESD publishes only the date it received
   each notice, and the compilation uses it as the notice date. We keep those notices. The
   limits on the page say that some states give the date the state received the notice.
