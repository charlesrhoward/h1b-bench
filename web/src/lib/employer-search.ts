import { supabase } from "./supabase";
import { getEmployer, searchEmployerHits, type EmployerHit } from "./queries";
import { getTickerMap } from "./employer-tickers";

/** A search hit, with the employer's stock ticker when it has one. */
export type TickerEmployerHit = EmployerHit & { ticker: string | null };

/** "$msft", " MSFT " -> "MSFT". Tickers are 1 to 10 letters, dots, or hyphens. */
function asTicker(term: string): string | null {
  const ticker = term.trim().replace(/^\$/, "").toUpperCase();
  return /^[A-Z][A-Z.-]{0,9}$/.test(ticker) ? ticker : null;
}

/** All-time H-1B filings for one employer, for a ticker hit that name search did not return. */
async function employerFilings(id: number): Promise<number> {
  const { data } = await supabase
    .from("employer_year_stats")
    .select("filings")
    .eq("employer_id", id)
    .eq("visa_class", "H-1B");
  return (data ?? []).reduce((sum, row) => sum + Number(row.filings), 0);
}

/** The hit for the employer that owns a ticker: from name search when possible, else built from its row. */
async function tickerHit(id: number, nameHits: EmployerHit[]): Promise<EmployerHit | null> {
  const inResults = nameHits.find((hit) => hit.id === id);
  if (inResults) return inResults;
  const employer = await getEmployer(id);
  if (!employer) return null;
  const filings = await employerFilings(id);
  return { id, name: employer.name, city: employer.city, state: employer.state, filings };
}

/**
 * Employer search by name or ticker. When the term is a ticker ("msft", "$MSFT"), that
 * employer comes first; the name matches follow.
 */
export async function searchEmployersWithTickers(term: string, limit: number): Promise<TickerEmployerHit[]> {
  const [nameHits, tickers] = await Promise.all([searchEmployerHits(term, limit), getTickerMap()]);
  const ticker = asTicker(term);
  const tickerId = ticker ? tickers.byTicker.get(ticker) : undefined;
  const first = tickerId == null ? null : await tickerHit(tickerId, nameHits);
  const hits = first ? [first, ...nameHits.filter((hit) => hit.id !== first.id)].slice(0, limit) : nameHits;
  return hits.map((hit) => ({ ...hit, ticker: tickers.byId.get(hit.id) ?? null }));
}
