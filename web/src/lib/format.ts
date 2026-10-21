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

const US_COUNTRY_NAMES = new Set(["US", "USA", "UNITEDSTATES", "UNITEDSTATESOFAMERICA"]);

/** Omit the U.S. suffix after a city or state; retain countries for foreign addresses. */
export function fmtLocation({ city, state, country }: {
  city: string | null;
  state: string | null;
  country: string | null;
}): string {
  const parts = [city?.trim(), state?.trim()].filter((part): part is string => Boolean(part));
  const name = (country ?? "").trim();
  const isUS = US_COUNTRY_NAMES.has(name.toUpperCase().replace(/[^A-Z]/g, ""));
  if (name && (!isUS || parts.length === 0)) parts.push(name);
  return parts.join(", ");
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
