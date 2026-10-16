import type { Metadata } from "next";
import Link from "@/components/intent-link";
import { searchEmployersWithTickers, type TickerEmployerHit } from "@/lib/employer-search";
import { fmtInt } from "@/lib/format";
import { PAGES } from "@/lib/pages";
import { pageMetadata } from "@/lib/site";
import { FISCAL_YEARS } from "@/lib/fiscal-years";
import { EmployerFlagPills } from "@/components/employer-flags";
import { getEmployerFlags } from "@/lib/employer-flags";
import { getEmployerLinker } from "@/lib/employer-tickers";
import EmployerLeaderboard from "@/components/employer-leaderboard";

// A year leaderboard without a search term is rewritten to /leaderboards/employers/[year]
// (next.config.ts), which the CDN caches. This page renders per request: a search, or the
// latest year when `year` is not a known fiscal year.
export const revalidate = 3600;

/** Own ticker, or the parent's ticker marked as a subsidiary. */
function SearchTickerTag({ hit }: { hit: TickerEmployerHit }) {
  const own = hit.ticker ?? (hit.parent_is_self ? hit.parent_ticker : null);
  if (own) return <span className="font-code text-xs text-neutral-secondary">{own} </span>;
  if (!hit.parent_ticker) return null;
  return (
    <span className="text-xs text-neutral-secondary" title={`Subsidiary of ${hit.parent_name ?? hit.parent_ticker}`}>
      <span className="font-code">{hit.parent_ticker}</span> subsidiary{" "}
    </span>
  );
}

export const metadata: Metadata = pageMetadata(PAGES.employers);

export default async function EmployersPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; q?: string }>;
}) {
  const { year, q } = await searchParams;
  const term = q?.trim() ?? "";

  if (term) {
    const employerHrefPromise = getEmployerLinker();
    const hits = await searchEmployersWithTickers(term, 100);
    const [flags, employerHref] = await Promise.all([getEmployerFlags(hits.map((h) => h.id)), employerHrefPromise]);
    return (
      <div className="space-y-8">
        <div>
          <h1 className="type-title">Employer search</h1>
          <p className="mt-2 text-neutral-secondary">
            {hits.length} {hits.length === 1 ? "match" : "matches"} for “{term}” · all-time H-1B filings
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" data-hide="3">
            <thead>
              <tr>
                <th>#</th>
                <th>Employer</th>
                <th>Location</th>
                <th className="text-right">H-1B filings (all years)</th>
              </tr>
            </thead>
            <tbody>
              {hits.map((h, i) => (
                <tr key={h.id}>
                  <td className="tabular-nums text-neutral-secondary">{i + 1}</td>
                  <td>
                    <Link href={employerHref(h)} className="font-medium hover:text-accent-primary">
                      {h.name}
                    </Link>{" "}
                    <SearchTickerTag hit={h} />
                    <EmployerFlagPills flags={flags.get(h.id)} />
                  </td>
                  <td className="text-neutral-secondary">
                    {[h.city, h.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="text-right tabular-nums">{fmtInt(h.filings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hits.length === 0 && (
          <p className="type-meta">
            No employers matched. Try a shorter or different spelling — the search is typo-tolerant.
          </p>
        )}
      </div>
    );
  }

  const fy = FISCAL_YEARS.includes(Number(year)) ? Number(year) : FISCAL_YEARS[0];
  return <EmployerLeaderboard fy={fy} />;
}
