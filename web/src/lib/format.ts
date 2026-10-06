export function fmtInt(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function fmtPct(part: number | null | undefined, whole: number | null | undefined): string {
  if (part == null || !whole) return "—";
  return ((part / whole) * 100).toFixed(1) + "%";
}
