import { CHEAP_LABOR_FY, type MarketGapSummary } from "@/lib/cheap-labor";
import { fmtInt, fmtPct } from "@/lib/format";

export default function InvestigationIntro({ summary }: { summary?: MarketGapSummary }) {
  const hasComparison = summary && summary.filings_matched > 0;
  return (
    <header className="investigation-intro" id="top">
      <div className="investigation-dateline">
        <span>H1B Bench <span aria-hidden="true">/</span> The evidence</span>
        <span>Wage analysis · FY{CHEAP_LABOR_FY}</span>
      </div>
      <div className="investigation-headline">
        <p className="story-kicker">The question: Is H-1B used as cheap labor?</p>
        <h1>Look past the salary.<br />Look at <em>the pay gap.</em></h1>
        <p className="story-deck">
          A six-figure offer can still fall below local pay.
          We compared H-1B offers with the median wage for the same occupation and area.
        </p>
        <p className="story-byline">An analysis by H1B Bench <span aria-hidden="true">·</span> Public records. Open methods.</p>
      </div>
      {hasComparison ? <LeadFinding summary={summary} /> : (
        <p className="finding-unavailable">The local pay comparison is unavailable. Other available evidence appears below.</p>
      )}
      <div className="story-takeaway">
        <p className="story-kicker">What this means</p>
        <div>
          <p>
            {hasComparison
              ? "The data supports a specific concern: many H-1B offers are low relative to local pay, even when the salary looks high."
              : "The wage floor, the offered salary, and the local median measure different things. This investigation separates them."}
          </p>
          <p className="takeaway-limit">
            Below-median pay does not by itself prove a wage violation or that an American worker lost a job.
            These are offers on certified filings, not records of actual pay or visa grants.
          </p>
        </div>
      </div>
    </header>
  );
}

function LeadFinding({ summary }: { summary: MarketGapSummary }) {
  const share = (summary.below_median / summary.filings_matched) * 100;
  return (
    <figure className="lead-finding">
      <div className="lead-finding-number">
        <strong>{fmtPct(summary.below_median, summary.filings_matched)}</strong>
        <span>of matched filings offer<br />less than the local median</span>
      </div>
      <div className="lead-finding-chart">
        <figcaption>Where H-1B offers fall against local pay</figcaption>
        <div className="lead-finding-bar" aria-hidden="true">
          <span style={{ width: `${share}%` }} />
        </div>
        <div className="lead-finding-labels">
          <span><i />Below the median <strong>{fmtPct(summary.below_median, summary.filings_matched)}</strong></span>
          <span><i />At or above <strong>{fmtPct(summary.filings_matched - summary.below_median, summary.filings_matched)}</strong></span>
        </div>
        <p className="chart-note">
          {fmtInt(summary.filings_matched)} matched filings · FY{CHEAP_LABOR_FY} · U.S. Department of Labor<br />
          Low end of the offered range. Local median includes all experience levels.
        </p>
        <a href="#finding-1" className="chart-method-link">How we made the comparison <span aria-hidden="true">↗</span></a>
      </div>
    </figure>
  );
}
