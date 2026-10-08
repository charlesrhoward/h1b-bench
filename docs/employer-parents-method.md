# Employer parent companies (subsidiaries of public companies): method

**Status: fixed before the first load.**

## Question

Many large employers file H-1B LCAs through a subsidiary, not through the public company.
Google LLC files, not Alphabet Inc. Which employers are subsidiaries of a public company, and
what is that company's ticker? The employer page shows a "Subsidiary of" chip, and a search
for the parent's ticker finds the subsidiary. The site shows no number from this match.

## Sources

| Side | Source |
|------|--------|
| Public companies | SEC `company_tickers.json` (sec.gov/files/company_tickers.json): CIK, ticker, name |
| Subsidiaries | The subsidiary list in each company's most recent annual report on EDGAR: Exhibit 21 ("Subsidiaries of the Registrant") of a 10-K, or Exhibit 8 of a 20-F (foreign private issuers) |
| Employers | `employers.name_normalized`; all-time filing counts from the LCA disclosure files |

## Population

- Parents: the first 1,500 companies in `company_tickers.json` (the SEC lists the largest
  companies first). The SEC list has some companies with more than one ticker. The first ticker
  in the list is used.
- Employers: at least 25 LCA filings across all years, and no ticker of their own
  (`docs/employer-tickers-method.md`).

## Matching rules

1. The loader reads the filing index of the parent's latest 10-K or 20-F and takes the document
   whose Type is `EX-21` (10-K) or `EX-8` (20-F), or a numbered variant such as `EX-21.1`.
2. Each text cell of that exhibit is a candidate name. Jurisdictions and headings are also
   cells, but they do not match an employer name.
3. An employer matches when its `company_key` (`etl/warn.py`) exactly equals the
   `company_key` of a name in the exhibit. No fuzzy matching is used.
4. An employer that matches subsidiaries of more than one parent is dropped.
5. **Same company:** when the employer's FEIN equals the parent's SEC EIN, the employer is the
   public company itself under another name (for example, "Applied Materials, Inc" against
   "APPLIED MATERIALS INC /DE"). The link is stored as `same_company`, and the chip shows the
   company and ticker without "Subsidiary of".
6. **Own-name matches:** an employer whose name is the parent's own name, without an EIN match,
   matched a heading such as "Subsidiaries of General Motors Company", not a listed subsidiary.
   It is dropped. A trailing state tag in the SEC name ("/DE/") is ignored for this rule.

## Storage

- `sec_subsidiary_exhibits`: the annual report that was read for each parent (accession, filing
  date, form, exhibit URL).
- `sec_subsidiaries`: the names read from each exhibit. Reruns ask the SEC for a new exhibit
  only when the parent has filed a newer annual report.
- `employer_parents`: the result, with the exhibit URL as the source of each link. The site reads
  only this table and never calls the SEC.

## Known limits

- The exhibit can leave out subsidiaries that are not "significant" under SEC rules. A subsidiary
  that is not in the exhibit cannot match.
- The exhibit lists subsidiaries at the date of the report. A subsidiary sold after that date can
  still match until the next report.
- A parent outside the first 1,500 companies is not read.
- `company_key` drops legal-form words, so "X, Inc." matches a listed "X, LLC". An employer
  with no FEIN cannot be checked by rule 5.
- Subsidiary names are matched by name only. Two companies can have the same name; the
  25-filing floor and rule 4 lower that risk but do not remove it.
