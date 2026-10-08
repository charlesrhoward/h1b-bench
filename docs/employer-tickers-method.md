# Employer tickers (page URLs): method

**Status: fixed before the first load.**

## Question

Which employers are public companies, and what is their stock ticker? Each such employer page uses
the ticker as its URL (`/employers/msft`). The site shows no number from this match.

## Sources

| Side | Source |
|------|--------|
| Tickers | SEC `company_tickers.json` (sec.gov/files/company_tickers.json): CIK, ticker, company name |
| Company EIN | SEC EDGAR submissions API (`data.sec.gov/submissions/CIK##########.json`), field `ein` |
| Employer FEIN | `employers.fein`: the most frequent `EMPLOYER_FEIN` on the employer's LCA filings |

## Matching rules

1. **Name candidate:** the employer's `company_key` (`etl/warn.py`: name normalized, text after
   " DBA " removed, trailing legal-form words removed, leading THE removed) exactly equals the
   `company_key` of the SEC company name. No fuzzy matching is used.
2. **EIN confirmation:** the candidate is kept only when the employer's FEIN (digits only)
   equals the SEC EIN for that CIK. A name match alone is never enough. A blank EIN or the
   all-zero placeholder (`000000000`) never matches.
3. **One ticker per employer:** when a company has more than one ticker (share classes), the
   first one in `company_tickers.json` is used.
4. **One employer per ticker:** when more than one employer row matches a ticker, the row with
   the most LCA filings (all years) gets it. The other rows keep the name-and-id URL.
5. Tickers that contain a digit are dropped, so a ticker URL can never look like an id URL.

## Storage

- `sec_companies` stores the EIN (or no EIN) for every CIK the loader has asked the SEC about.
  Later runs ask the SEC only about new CIKs. The site never calls the SEC.
- `employer_tickers` stores the result. The site reads only this table.

## Known limits

- A subsidiary that files under its own FEIN does not match its parent's ticker. For
  example, Google LLC and Amazon.com Services LLC file with FEINs that are not the EINs of
  Alphabet Inc. and Amazon.com, Inc. Those employers keep the name-and-id URL.
- The SEC lists the EIN that the company reports. Some filers leave it blank. Those companies
  cannot match.
- Employers with no FEIN in the LCA data cannot match.

## URLs

- Matched employers: `/employers/<ticker in lowercase>`.
- Every other employer: `/employers/<name slug>-<id>`.
- Old URLs (`/employers/<id>`) and URLs with an out-of-date slug redirect (308) to the
  canonical URL.
