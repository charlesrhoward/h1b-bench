# Domestic labor pool: method

**Status: fixed before any results were computed.** This file is committed on its own,
ahead of the code and output that use it, so the git history shows the rules were not
tuned to reach a conclusion.

## Question

What share of H-1B roles are in occupations where unemployed U.S. workers who have
recent experience in that occupation and a bachelor's degree could fill them?

The claim tested is **"most, not all."** It does not say any specific role could be filled
by any specific person.

## Sources

| Side | Source | Unit |
|------|--------|------|
| Demand | DOL OFLC LCA disclosure data, FY2025 (Oct 2024 to Sep 2025), certified H-1B cases | LCA filings and new-employment positions |
| Supply | Census Bureau American Community Survey (ACS) 2024 1-year PUMS, person file | Weighted persons, with 80 replicate weights for error |
| Bridge | Census 2018 occupation code list (SOC code to Census occupation code) | Occupation group |

## Definitions

- **Occupation group:** a 2018 Census occupation code (`OCCP`). Each LCA's 6-digit SOC
  code maps to one group through the Census crosswalk: an exact SOC match wins, otherwise
  the most specific grouped code (for example `15-20XX`) that contains it. Some groups
  combine several SOC codes, so the LCA side is summed to the same group.
- **Supply:** weighted count of ACS persons who are civilians, unemployed (`ESR = 3`:
  without work, looking, and available), hold a bachelor's degree or higher (`SCHL >= 21`),
  and whose most recent job was in the group (`OCCP`). ACS assigns an occupation to
  unemployed people from the job they held in the past 5 years.
- **Demand:** FY2025 certified H-1B LCA **new-employment positions** in the group
  (`NEW_EMPLOYMENT`). Continuations, extensions, and employer changes are excluded, because
  those workers are already employed in the U.S.
- **Error:** the 90% margin of error comes from the ACS successive-difference replicate
  weights, using the Census formula `SE = sqrt(4/80 × Σ(rep_i − est)²)` and
  `MOE = 1.645 × SE`.

## Decision rule

An occupation group is **covered** when the **lower bound** of supply (estimate minus MOE)
is at least as large as demand. Using the lower bound means sampling error can only count
against the claim.

**Headline:** the share of all FY2025 certified H-1B LCA filings that fall in covered
groups. **"Most" means more than 50%.**

## Stricter tiers

The same rule runs three times. Each tier only shrinks supply:

1. **National:** supply as defined above.
2. **Recent:** supply restricted to people who last worked within the past 12 months
   (`WKL = 1`).
3. **Same state:** supply and demand are both computed per state (ACS state of residence,
   LCA worksite state). A filing counts as covered only if its own state's cell passes the
   rule.

Results for all three tiers are published, including the groups that are not covered.

## Known limits (stated with every result)

- Most recent occupation does not prove someone can do a specific job. Seniority,
  specialization, and wage expectations are not measured.
- An LCA is not a visa, and a new-employment position is not always filled.
- Supply is one point-in-time count. The number of people who are unemployed at some point
  during a year is larger, so this undercounts supply.
- ACS 2024 (calendar year) and LCA FY2025 overlap by 9 months but are not the same period.
- Persons not in the labor force, and employed workers who would switch jobs, are excluded.
  Both exclusions can only reduce supply.
