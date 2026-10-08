# Employer flags: method

**Status: fixed before the flags were shown.** This file is committed on its own, ahead of
the code that uses it.

## Question

Which employer pages must show, at the top of the page, that the employer's H-1B filings
offer less than local pay, or that the employer filed H-1B filings for new workers after
layoffs?

The flags add no new numbers. Each flag is a rule over a table that the site already
publishes.

## Flag 1: Underpaid

**Source:** `employer_market_gap`, FY2025 (`docs/market-gap-method.md`).

An employer gets the flag when all of these are true:

- At least **25** of its filings matched a local median.
- More than **two thirds** of its matched filings offer less than the local median.
- Its median gap (offered pay − local median) is less than $0.

Why these values:

- 25 filings: below that, a few filings decide the result.
- Two thirds: across all matched filings, 55.8% are below the local median. A rule at
  one half would flag employers that are only at the average. Two thirds is well above it.
- The negative median gap makes sure the typical filing is below the median, not only
  most filings by a small amount.

When we fixed the rule, 1,919 employers had at least 25 matched filings. Of those, 793
(41%) meet the rule.

The flag text says what the data shows: the share of matched filings that offer less than
the local median pay for the job, and the median gap.

### Limits (shown with the flag)

- Offered pay is the bottom of the offered range (`WAGE_RATE_OF_PAY_FROM`). An employer
  can pay more. The data does not show what workers were actually paid.
- The local median is DOL's Level III wage: the 50th percentile for the occupation and
  area, for workers at all experience levels.
- The data does not compare H-1B workers with the employer's own U.S. workers.

## Flag 2: Layoffs, then H-1B filings

**Source:** `employer_layoff_filings` (`docs/layoff-filings-method.md`).

An employer gets the flag when its company has at least one WARN layoff notice that was
followed, within 365 days, by at least one certified H-1B filing for a new worker. This is
the same population as finding 6: a row in `employer_layoff_filings` exists only for those
companies.

The flag text gives the workers in those notices, the counted filings in the 365 days
after them, and the states of the notices.

### Limits (shown with the flag)

- The data shows the order of events only. It does not show that H-1B workers replaced
  the workers who were laid off.
- An LCA certification is a filing step. It is not a visa, a hire, or a petition approval.
- Totals are for the whole company (all employer names with the same company key).

## Where the flags appear

- The top of each employer page, directly under the employer name, before any other data.
- The employer leaderboard and employer search results, next to the employer name.
