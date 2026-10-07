import Link from "next/link";
import { CHEAP_LABOR_FY, type EmployerMarketGap } from "@/lib/cheap-labor";
import { fmtInt, fmtPct } from "@/lib/format";
import { fmtGap } from "./market-gap-tables";

/** Below this many matched filings, the employer note is not shown. */
const MIN_NOTE_FILINGS = 10;

/** One line on an employer page: how often its filings offer less than the local median. */
export default function EmployerMarketGapNote({ gap }: { gap: EmployerMarketGap | null }) {
  if (!gap || gap.filings_matched < MIN_NOTE_FILINGS) return null;
  return (
    <p className="type-meta">
      Pay vs. local median (FY{CHEAP_LABOR_FY}): {fmtInt(gap.below_median)} of{" "}
      {fmtInt(gap.filings_matched)} matched filings (
      {fmtPct(gap.below_median, gap.filings_matched)}) offer less than the local median for the job.
      Median gap: {fmtGap(gap.median_gap)}.{" "}
      <Link href="/pay-vs-market" className="link">
        How we measure this
      </Link>
    </p>
  );
}
