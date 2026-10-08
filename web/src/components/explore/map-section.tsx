"use client";

import { useCallback, useState } from "react";
import { stateMetricValue, type StateMetric, type StateSummary } from "@/lib/explore-stats";
import { fmtInt } from "@/lib/format";
import { Segmented, type Choice } from "./controls";
import ExploreFigure from "./explore-figure";
import PlotFigure from "./plot-figure";
import { STATE_METRICS } from "./state-metrics";
import type { Palette } from "./use-palette";

const METRIC_CHOICES: Choice<StateMetric>[] = (Object.keys(STATE_METRICS) as StateMetric[]).map((value) => ({
  value,
  label: STATE_METRICS[value].label,
}));

/** One sentence that reads the current view in words, so the chart has a plain-text summary. */
function Readout({ summary, occTitle }: { summary: StateSummary | undefined; occTitle: string | null }) {
  if (!summary) return <p className="type-body text-neutral-secondary">No certified H-1B filings match this view.</p>;
  const where = summary.code === "US" ? "Across the U.S." : `In ${summary.name}`;
  const scope = occTitle ? ` for ${occTitle.toLowerCase()}` : "";
  const ratio = stateMetricValue(summary, "perPosition");
  return (
    <p className="type-body max-w-3xl text-neutral-primary">
      {where}
      {scope}, employers filed <strong className="font-semibold">{fmtInt(summary.filings)}</strong> certified
      H-1B LCAs for <strong className="font-semibold">{fmtInt(summary.positions)}</strong> new positions.{" "}
      {summary.supply == null ? (
        "The Census survey in this data does not cover this territory."
      ) : (
        <>
          <strong className="font-semibold">{fmtInt(summary.supply)}</strong> unemployed people with a degree had
          their last job in the same occupations
          {ratio == null ? "." : <>: {STATE_METRICS.perPosition.format(ratio)} per new position.</>}
        </>
      )}
    </p>
  );
}

export default function MapSection({
  summaries,
  selected,
  occTitle,
  onSelect,
}: {
  summaries: Map<string, StateSummary>;
  selected: string;
  occTitle: string | null;
  onSelect: (code: string) => void;
}) {
  const [metric, setMetric] = useState<StateMetric>("perPosition");
  const map = useCallback(
    async (width: number, palette: Palette) => {
      const { buildStateMap } = await import("./state-map-chart");
      return buildStateMap({ summaries, metric, selected, onSelect }, width, palette);
    },
    [summaries, metric, selected, onSelect],
  );
  const bars = useCallback(
    async (width: number, palette: Palette) => {
      const { buildStateBars } = await import("./state-bars-chart");
      return buildStateBars({ summaries, metric, selected, onSelect }, width, palette);
    },
    [summaries, metric, selected, onSelect],
  );

  return (
    <ExploreFigure
      controls={<Segmented label="Color the map by" value={metric} choices={METRIC_CHOICES} onChange={setMetric} />}
      readout={<Readout summary={summaries.get(selected)} occTitle={occTitle} />}
      notes={[
        "Click a state to see its occupations and employers below. Click it again to go back to the whole country.",
        "“Could cover” uses the low end of the survey's 90% range. A filing counts only when its state's unemployed outnumber its state's new positions in that occupation.",
        "Unemployed means people with a bachelor's degree or higher whose last job was in the occupation. It leaves out the underemployed and people who stopped looking.",
        "The map shows the 50 states and DC. Guam, Puerto Rico, the Northern Mariana Islands, and the U.S. Virgin Islands have filings, but the survey does not cover them.",
      ]}
      source="DOL OFLC LCA disclosure data, FY2025 (certified H-1B); Census ACS 2024 1-year PUMS."
      method="labor-pool-method.md"
    >
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,2fr)]">
        <PlotFigure build={map} minHeight={240} label={`U.S. map: ${STATE_METRICS[metric].legend}, by state`} />
        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-secondary">Top states: {STATE_METRICS[metric].label.toLowerCase()}</p>
          <PlotFigure build={bars} minHeight={300} label={`Top states by ${STATE_METRICS[metric].legend}`} />
        </div>
      </div>
    </ExploreFigure>
  );
}
