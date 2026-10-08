import { supabase } from "./supabase";
import { searchEmployerHits, type EmployerHit } from "./queries";
import { getTickerMap, type TickerMap } from "./employer-tickers";

/** A search hit, with the employer's own ticker and, for a subsidiary, its parent's ticker. */
export type TickerEmployerHit = EmployerHit & {
  ticker: string | null;
  parent_ticker: string | null;
  parent_name: string | null;
  parent_is_self: boolean;
};

/** "$msft", " MSFT " -> "MSFT". Tickers are 1 to 10 letters, dots, or hyphens. */
function asTicker(term: string): string | null {
  const ticker = term.trim().replace(/^\$/, "").toUpperCase();
  return /^[A-Z][A-Z.-]{0,9}$/.test(ticker) ? ticker : null;
}

/** Employers that a ticker names: the company that owns it, then its subsidiaries. */
function tickerEmployerIds(ticker: string | null, tickers: TickerMap): number[] {
  if (!ticker) return [];
  const own = tickers.byTicker.get(ticker);
  const subsidiaries = tickers.byParentTicker.get(ticker) ?? [];
  return own == null ? subsidiaries : [own, ...subsidiaries];
}

/** Search hits for employers by id, with all-time H-1B filings, in two batched queries. */
async function hitsForIds(ids: number[]): Promise<EmployerHit[]> {
  if (ids.length === 0) return [];
  const [employers, stats] = await Promise.all([
    supabase.from("employers").select("id, name, city, state").in("id", ids).throwOnError(),
    supabase.from("employer_year_stats").select("employer_id, filings").eq("visa_class", "H-1B").in("employer_id", ids).throwOnError(),
  ]);
  const filings = new Map<number, number>();
  for (const row of stats.data ?? []) {
    const id = Number(row.employer_id);
    filings.set(id, (filings.get(id) ?? 0) + Number(row.filings));
  }
  return (employers.data ?? []).map((e) => ({
    id: Number(e.id),
    name: e.name,
    city: e.city,
    state: e.state,
    filings: filings.get(Number(e.id)) ?? 0,
  }));
}

/** Resolve ticker hits while name search runs, rather than waiting for its response. */
async function searchTickerHits(term: string) {
  const tickers = await getTickerMap();
  const ticker = asTicker(term);
  const ids = tickerEmployerIds(ticker, tickers);
  return { tickers, hits: await hitsForIds(ids), owner: tickers.byTicker.get(ticker ?? "") };
}

/** Ticker hits first (the ticker's owner, then subsidiaries by filings), then name matches. */
function orderHits(tickerHits: EmployerHit[], nameHits: EmployerHit[], owner: number | undefined, limit: number) {
  tickerHits.sort((a, b) => {
    if (a.id === owner) return -1;
    if (b.id === owner) return 1;
    return b.filings - a.filings;
  });
  const shown = new Set(tickerHits.map((hit) => hit.id));
  return [...tickerHits, ...nameHits.filter((hit) => !shown.has(hit.id))].slice(0, limit);
}

/**
 * Employer search by name or ticker. When the term is a ticker ("googl", "$MSFT"), the company
 * that owns it and its listed subsidiaries come first; the name matches follow.
 */
export async function searchEmployersWithTickers(term: string, limit: number): Promise<TickerEmployerHit[]> {
  const [nameHits, tickerSearch] = await Promise.all([searchEmployerHits(term, limit), searchTickerHits(term)]);
  const { tickers } = tickerSearch;
  const hits = orderHits(tickerSearch.hits, nameHits, tickerSearch.owner, limit);
  return hits.map((hit) => {
    const parent = tickers.parentById.get(hit.id);
    return {
      ...hit,
      ticker: tickers.byId.get(hit.id) ?? null,
      parent_ticker: parent?.parent_ticker ?? null,
      parent_name: parent?.parent_name ?? null,
      parent_is_self: parent?.relation === "same_company",
    };
  });
}
