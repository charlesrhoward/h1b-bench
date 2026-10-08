import { supabase } from "./supabase";
import { employerPath, type EmployerRef } from "./employer-path";

/**
 * Stock tickers for employers whose FEIN matches the EIN of an SEC-listed company
 * (docs/employer-tickers-method.md, table employer_tickers). Server only.
 */
export type TickerMap = { byId: Map<number, string>; byTicker: Map<string, number> };

/** Tickers change only when the loader runs, so one fetch per hour per server is enough. */
const TICKER_TTL_MS = 60 * 60 * 1000;
const PAGE_SIZE = 1000;

let cached: { at: number; map: Promise<TickerMap> } | null = null;

async function fetchTickerRows(): Promise<{ employer_id: number; ticker: string }[]> {
  const rows: { employer_id: number; ticker: string }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("employer_tickers")
      .select("employer_id, ticker")
      .order("employer_id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      // Before the table is loaded, every employer falls back to its name-and-id URL.
      console.error("employer tickers:", error.message);
      return rows;
    }
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

async function buildTickerMap(): Promise<TickerMap> {
  const rows = await fetchTickerRows();
  return {
    byId: new Map(rows.map((r) => [Number(r.employer_id), r.ticker])),
    byTicker: new Map(rows.map((r) => [r.ticker.toUpperCase(), Number(r.employer_id)])),
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
