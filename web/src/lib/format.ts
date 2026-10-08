export function fmtInt(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("en-US");
}

/** Short count for tight spaces, e.g. 697K or 1.25M. */
export function fmtCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumSignificantDigits: 3 }).format(n);
}

export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

/**
 * Share as a percent with one decimal. Rounding never reaches "100.0%" or "0.0%" unless the share
 * is exact: 57,758 of 57,786 shows ">99.9%", not "100.0%", and 1 of 5,000 shows "<0.1%".
 */
export function fmtPct(part: number | null | undefined, whole: number | null | undefined): string {
  if (part == null || !whole) return "—";
  const pct = (part / whole) * 100;
  if (pct > 99.95 && pct < 100) return ">99.9%";
  if (pct > 0 && pct < 0.05) return "<0.1%";
  return pct.toFixed(1) + "%";
}
