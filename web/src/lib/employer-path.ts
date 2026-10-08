/**
 * Employer page URLs. Safe to import from client components (no data access).
 *
 * - Public companies with a confirmed ticker: /employers/msft
 * - Every other employer: /employers/acme-consulting-48213 (name slug, then the id)
 *
 * The id at the end keeps slugs unique: two employers can share a slug, never an id.
 * Old numeric URLs (/employers/103782) and stale slugs redirect to the canonical path.
 */

const MAX_SLUG_LENGTH = 80;
const TRAILING_ID = /(?:^|-)(\d+)$/;
/** Tickers in URLs are letters, dots, and hyphens only, so they never look like an id. */
const TICKER_PARAM = /^[a-z][a-z.-]{0,9}$/;

export type EmployerRef = { id: number; name: string; ticker?: string | null };

export type EmployerParam = { kind: "id"; id: number } | { kind: "ticker"; ticker: string } | { kind: "invalid" };

/** "Ernst & Young U.S. LLP" -> "ernst-and-young-u-s-llp". */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
}

/** The last path segment of an employer's canonical URL. */
export function employerSegment({ id, name, ticker }: EmployerRef): string {
  if (ticker) return ticker.toLowerCase();
  const slug = slugify(name);
  return slug ? `${slug}-${id}` : `employer-${id}`;
}

/** Canonical site path for an employer page. */
export function employerPath(ref: EmployerRef): string {
  return `/employers/${employerSegment(ref)}`;
}

/** Reads the [slug] segment: a trailing id (new or old URL) or a ticker. */
export function parseEmployerParam(param: string): EmployerParam {
  const segment = decodeURIComponent(param).toLowerCase();
  const idMatch = TRAILING_ID.exec(segment);
  if (idMatch) return { kind: "id", id: Number(idMatch[1]) };
  if (TICKER_PARAM.test(segment)) return { kind: "ticker", ticker: segment.toUpperCase() };
  return { kind: "invalid" };
}
