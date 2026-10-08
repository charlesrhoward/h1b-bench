# Domestic labor pool: results

Computed with `etl/labor_pool.py` using the rules in
[labor-pool-method.md](labor-pool-method.md), which were committed before this run.
Inputs: ACS 2024 1-year PUMS and FY2025 certified H-1B LCAs (539,245 filings with a mapped
occupation; 0.04% of filings could not be mapped).

> **Scope: unemployed only.** This test counts only people who are unemployed. It does not
> count the underemployed: degree holders in jobs below their skills, and people who work
> part time but want full-time work. It also does not count people who gave up the search
> for work, or employed workers who could change jobs. The supply here is a floor, not the
> full pool of American workers. A failed test does not show that Americans cannot fill the
> other jobs.

## Headline: the unemployed alone do not cover most filings

| Tier | Filings in covered occupations | Share of all filings | Passes (>50%)? |
|------|-------------------------------:|---------------------:|:--------------:|
| National | 118,166 | **21.9%** | No |
| Recent (last worked in the past 12 months) | 109,112 | 20.2% | No |
| Same state | 62,444 | 11.6% | No |

Under the pre-set rule (lower bound of qualified unemployed ≥ new H-1B positions), about one
in five FY2025 H-1B filings is in an occupation where unemployed U.S. workers with a
bachelor's degree outnumber new H-1B positions.

## What drives it

Software developers are 31.7% of all filings. Their qualified unemployed pool is
56,247 ± 5,577, against 77,096 new H-1B positions. Even the pool's 90% upper bound falls
short. The next largest computer, math, and engineering groups fall short too.

The pool *is* large enough in **227 of 318** occupation groups that have H-1B filings, but
those groups hold only 21.9% of the filings. Note that this is a count of occupation
groups, not the pre-set headline measure.

## Measure 2 (added after Measure 1): positions the unemployed alone could fill

**Not in the pre-set rules.** This measure was defined after the Measure 1 result above was
seen, during review. It is reported separately and labeled that way on the site.

Measure 1 counts an occupation only when the unemployed can fill *all* of its new H-1B
positions. Software developers therefore count as zero, even though at least 50,670
unemployed developers (the lower bound) set against 77,096 new positions could fill 65.7% of
them. Measure 2 counts positions instead: in each occupation it takes the smaller of new
H-1B positions and the supply lower bound, then sums those across occupations.

| Tier | New H-1B positions the unemployed alone could fill | Share |
|------|---------------------------------------------------:|------:|
| National | 177,810 of 283,541 | **62.7%** |
| Recent (last worked in the past 12 months) | 130,216 of 283,541 | 45.9% |
| Same state | 77,057 of 283,541 | 27.2% |

This is computed by the `labor_pool_fillable` view over `labor_pool`. Neither measure counts
the underemployed.

## Top 20 occupation groups (79.8% of filings)

"Ratio" is the supply lower bound divided by new H-1B positions. Covered means a ratio of
at least 1.

| Occupation group | Filings | Share | New H-1B positions | Qualified unemployed (90% MOE) | Ratio | Covered | Covered (recent) |
|---|---:|---:|---:|---:|---:|:-:|:-:|
| Software developers | 170,843 | 31.7% | 77,096 | 56,247 ± 5,577 | 0.66 | no | no |
| Computer occupations, all other | 47,561 | 8.8% | 19,322 | 16,055 ± 3,104 | 0.67 | no | no |
| Other mathematical science occupations | 35,822 | 6.6% | 18,203 | 10,143 ± 1,874 | 0.45 | no | no |
| Software quality assurance analysts and testers | 18,645 | 3.5% | 6,856 | 2,992 ± 920 | 0.30 | no | no |
| Electrical and electronics engineers | 14,986 | 2.8% | 13,649 | 3,902 ± 1,124 | 0.20 | no | no |
| Computer programmers | 13,460 | 2.5% | 5,325 | 6,334 ± 1,308 | 0.94 | no | no |
| Computer systems analysts | 12,958 | 2.4% | 4,854 | 12,421 ± 2,227 | 2.10 | yes | yes |
| Computer and information systems managers | 12,626 | 2.3% | 3,045 | 14,680 ± 2,739 | 3.92 | yes | yes |
| Postsecondary teachers | 11,703 | 2.2% | 5,764 | 23,388 ± 3,184 | 3.51 | yes | yes |
| Database administrators and architects | 11,699 | 2.2% | 3,356 | 2,779 ± 1,076 | 0.51 | no | no |
| Other physicians | 10,590 | 2.0% | 5,485 | 6,167 ± 1,574 | 0.84 | no | no |
| Industrial engineers, including health and safety | 10,428 | 1.9% | 4,849 | 2,782 ± 895 | 0.39 | no | no |
| Mechanical engineers | 10,171 | 1.9% | 4,061 | 4,100 ± 1,499 | 0.64 | no | no |
| Accountants and auditors | 9,492 | 1.8% | 5,007 | 29,778 ± 3,621 | 5.22 | yes | yes |
| Financial and investment analysts | 7,625 | 1.4% | 5,127 | 5,291 ± 1,014 | 0.83 | no | no |
| Operations research analysts | 7,490 | 1.4% | 3,243 | 2,431 ± 985 | 0.45 | no | no |
| Biological scientists | 6,991 | 1.3% | 3,393 | 1,941 ± 886 | 0.31 | no | no |
| Management analysts | 6,368 | 1.2% | 7,561 | 27,951 ± 3,418 | 3.24 | yes | yes |
| Civil engineers | 5,768 | 1.1% | 2,697 | 5,112 ± 1,154 | 1.47 | yes | no |
| Network and computer systems administrators | 5,312 | 1.0% | 3,050 | 1,888 ± 827 | 0.35 | no | no |

## Caveats

Every limit listed in the method applies. The most important for reading this result: supply is a single point-in-time count of unemployed people, while demand is a full year of new positions. The number of people who are unemployed at some point during a year is larger than any single-day count, so this test understates supply. A test using annual flows would be a **different analysis**. It must be defined and committed separately, and labeled as designed after this result was seen.

## Mapping notes

PUMS merges 40 of the 570 Census occupation codes into broader groups. For example,
statisticians and mathematicians fall under "other mathematical science occupations", and
radiologists under "physicians". LCA job codes in those 40 are re-matched to the PUMS group,
and the script prints every re-match when it runs.
