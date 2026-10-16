/** Fiscal years with LCA data, newest first. The first year is the current, year-to-date one. */
export const FISCAL_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

/** Route params for pages built once per fiscal year (`/leaderboards/.../[year]`). */
export function fiscalYearParams() {
  return FISCAL_YEARS.map((year) => ({ year: String(year) }));
}
