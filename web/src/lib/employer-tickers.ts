import { supabase } from "./supabase";
import { employerPath, type EmployerRef } from "./employer-path";

/**
 * Stock tickers for employers. Server only.
 * - Own ticker: the employer's FEIN matches the EIN of an SEC-listed company
 *   (docs/employer-tickers-method.md, table employer_tickers).
 * - Parent: the employer is listed in a public company's 10-K Exhibit 21
 *   (docs/employer-parents-method.md, table employer_parents).
 */
export type EmployerParent = {
  employer_id: number;
  parent_ticker: string;
  parent_name: string;
  /** same_company: the employer's FEIN is the parent's EIN (the public company under another name). */
  relation: "subsidiary" | "same_company";
  filed: string;
  source_url: string;
};

export type TickerMap = {
  byId: Map<number, string>;
  byTicker: Map<string, number>;
  parentById: Map<number, EmployerParent>;
  /** Subsidiary employer ids per parent ticker. */
  byParentTicker: Map<string, number[]>;
};

/** Tickers change only when the loaders run, so one fetch per hour per server is enough. */
const TICKER_TTL_MS = 60 * 60 * 1000;
const PAGE_SIZE = 1000;

let cached: { at: number; map: Promise<TickerMap> } | null = null;

/** Every row of a small table, paged. On error (for example, before the table exists) returns what it has. */
async function fetchAllRows<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("employer_id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      // Before a table is loaded, employers fall back to name-and-id URLs and no parent chip.
      console.error(`${table}:`, error.message);
      return rows;
    }
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) return rows;
  }
}

function groupByParentTicker(parents: EmployerParent[]): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  for (const p of parents) {
    const ids = groups.get(p.parent_ticker) ?? [];
    ids.push(Number(p.employer_id));
    groups.set(p.parent_ticker, ids);
  }
  return groups;
}

async function buildTickerMap(): Promise<TickerMap> {
  const [tickers, parents] = await Promise.all([
    fetchAllRows<{ employer_id: number; ticker: string }>("employer_tickers", "employer_id, ticker"),
    fetchAllRows<EmployerParent>("employer_parents", "employer_id, parent_ticker, parent_name, relation, filed, source_url"),
  ]);
  return {
    byId: new Map(tickers.map((r) => [Number(r.employer_id), r.ticker])),
    byTicker: new Map(tickers.map((r) => [r.ticker.toUpperCase(), Number(r.employer_id)])),
    parentById: new Map(parents.map((p) => [Number(p.employer_id), p])),
    byParentTicker: groupByParentTicker(parents),
  };
}

export function getTickerMap(): Promise<TickerMap> {
  if (cached && Date.now() - cached.at < TICKER_TTL_MS) return cached.map;
  const map = buildTickerMap();
  cached = { at: Date.now(), map };
  map.catch(() => {
    cached = null;
  });
  return map;
}

/** Canonical path builder that knows tickers. Use it in server components that link to employers. */
export async function getEmployerLinker(): Promise<(ref: EmployerRef) => string> {
  const { byId } = await getTickerMap();
  return (ref) => employerPath({ ...ref, ticker: ref.ticker ?? byId.get(ref.id) ?? null });
}
