# Multiple H-1B lottery registrations: method

**Status: fixed before any results were computed.** This file is committed on its own,
ahead of the code and output that use it.

## Question

Before USCIS changed the H-1B lottery in 2024, how many lottery registrations were for
people who had more than one registration, and what happened to that number after the
change?

## Background

Each year, employers register the people they want to hire, and USCIS selects
registrations at random. Up to the FY2024 lottery, each registration was a separate
entry. A person with registrations from several employers had several chances of
selection. USCIS states that it found registrations from related companies for the same
person, opened fraud investigations, and changed the rule. From the FY2025 lottery, USCIS
selects by person, so each person has one chance however many registrations they have
(final rule "Improving the H-1B Registration Selection Process and Program Integrity",
Federal Register, February 2, 2024).

## Source

USCIS, "H-1B Electronic Registration Process", Historical Data table, cap fiscal years
2021 to 2026, as published on the page last updated September 21, 2026:
https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations/h-1b-electronic-registration-process

The six rows are copied by hand from that table into the `uscis_registrations` table, one
row per cap fiscal year, with all five published columns: total registrations, eligible
registrations, eligible registrations for people with no other eligible registration,
eligible registrations for people with multiple eligible registrations, and selected
registrations. No other source is used and no value is estimated.

## Measures

1. Share of eligible registrations that are for people with multiple eligible
   registrations, per cap fiscal year: multiple / eligible.
2. The same share for FY2024 (the last lottery before the rule) and FY2026 (the latest).
3. Eligible registrations per selected registration, per cap fiscal year.

## Known limits

- A person can have offers from more than one employer for lawful reasons. The table does
  not show which multiple registrations were coordinated, so the share is an upper bound
  on gaming, not a count of fraud.
- USCIS does not publish the employers behind multiple registrations, so this measure
  cannot name companies.
- "Selected registrations" is a count of registrations, not of people or of approved
  petitions.
