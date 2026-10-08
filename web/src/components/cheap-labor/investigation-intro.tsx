import { CHEAP_LABOR_FY, type MarketGapSummary } from "@/lib/cheap-labor";
import { fmtInt, fmtPct } from "@/lib/format";
import balanceScale from "@/assets/art/balance-scale.webp";
import HeaderArt from "@/components/header-art";
import { Eyebrow } from "@/components/title-tags";

export default function InvestigationIntro({ summary }: { summary?: MarketGapSummary }) {
  const hasComparison = summary && summary.filings_matched > 0;
  return (
    <header className="relative space-y-6" id="top">
      <HeaderArt src={balanceScale} className="-top-6 right-0 w-56 opacity-50 lg:w-72 lg:opacity-100 xl:w-80" />
      <Eyebrow parts={[`FY${CHEAP_LABOR_FY}`, "the evidence on pay"]} />
      <h1 className="type-title text-balance">H-1B pay vs. the local market</h1>
      {hasComparison ? <LeadFinding summary={summary} /> : (
        <p className="type-body text-neutral-secondary">The local pay comparison is unavailable. Other available evidence appears below.</p>
      )}
      <div className="space-y-3 border-l-2 border-accent-primary pl-5 text-[15px] leading-relaxed text-neutral-primary">
        <p>
          <strong className="text-neutral-primary">Why it matters.</strong>{" "}
          A six-figure salary can still fall below local pay. The useful comparison is the same occupation in the same area.
        </p>
        <p>
          <strong className="text-neutral-primary">What this does not prove.</strong>{" "}
          A below-median offer alone does not establish a wage violation or job replacement.
          These filings report offers, not actual paychecks or visa grants.
        </p>
      </div>
    </header>
  );
}

function LeadFinding({ summary }: { summary: MarketGapSummary }) {
  return (
    <p className="type-body dropcap text-neutral-primary">
      <strong className="font-semibold">
        The clearest finding: {fmtPct(summary.below_median, summary.filings_matched)} of matched filings offer less than local median pay.
      </strong>{" "}
      That comparison uses {fmtInt(summary.filings_matched)} H-1B filings from FY{CHEAP_LABOR_FY}. We
      compare the low end of each offered range with the median for the same occupation and area.
      That median includes all experience levels.{" "}
      <a href="#finding-1" className="link">See the pay comparison <span aria-hidden="true">→</span></a>
    </p>
  );
}
