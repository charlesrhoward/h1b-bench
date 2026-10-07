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

export function fmtPct(part: number | null | undefined, whole: number | null | undefined): string {
  if (part == null || !whole) return "—";
  return ((part / whole) * 100).toFixed(1) + "%";
}
