import { CHEAP_LABOR_FY, type MarketGapSummary } from "@/lib/cheap-labor";
import { fmtInt, fmtPct } from "@/lib/format";
import { Eyebrow } from "@/components/title-tags";

export default function InvestigationIntro({ summary }: { summary?: MarketGapSummary }) {
  const hasComparison = summary && summary.filings_matched > 0;
  return (
    <header className="space-y-5" id="top">
      <Eyebrow parts={[`FY${CHEAP_LABOR_FY}`, "the evidence on pay"]} />
      <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">Is H-1B used as cheap labor?</h1>
      {hasComparison ? <LeadFinding summary={summary} /> : (
        <p className="text-zinc-400">The local pay comparison is unavailable. Other available evidence appears below.</p>
      )}
      <div className="space-y-3 border-l-2 border-emerald-400 pl-5 text-sm leading-relaxed text-zinc-300">
        <p>
          <strong className="text-zinc-100">Why it matters.</strong>{" "}
          A six-figure salary can still fall below local pay. The useful comparison is the same occupation in the same area.
        </p>
        <p>
          <strong className="text-zinc-100">What this does not prove.</strong>{" "}
          A below-median offer alone does not establish a wage violation or job replacement.
          These filings report offers, not actual paychecks or visa grants.
        </p>
      </div>
    </header>
  );
}

function LeadFinding({ summary }: { summary: MarketGapSummary }) {
  return (
    <div className="space-y-3">
      <p className="text-lg leading-relaxed text-zinc-300 sm:text-xl">
        <strong className="text-zinc-100">
          The clearest finding: {fmtPct(summary.below_median, summary.filings_matched)} of matched filings offer less than local median pay.
        </strong>{" "}
        That comparison uses {fmtInt(summary.filings_matched)} H-1B filings from FY{CHEAP_LABOR_FY}.
      </p>
      <p className="text-sm leading-relaxed text-zinc-400">
        We compare the low end of each offered range with the median for the same occupation and area.
        That median includes all experience levels.{" "}
        <a href="#finding-1" className="text-emerald-400 hover:underline">See the pay comparison <span aria-hidden="true">→</span></a>
      </p>
    </div>
  );
}
