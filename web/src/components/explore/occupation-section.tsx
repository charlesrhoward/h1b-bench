"use client";

import { useCallback, useMemo, useState } from "react";
import type { ExploreLaborCell } from "@/lib/explore-model";
import { NO_ACS_STATES } from "@/lib/explore-model";
import { fmtInt, fmtPct } from "@/lib/format";
import { stateName } from "@/lib/us-states";
import { FilterChip, SearchBox } from "./controls";
import ExploreFigure from "./explore-figure";
import { buildOccupationChart, matchOccupations, occupationPoints, type OccupationPoint } from "./occupation-chart";
import PlotFigure from "./plot-figure";
import type { Palette } from "./use-palette";

function Readout({ points, state, hidden }: { points: OccupationPoint[]; state: string; hidden: number }) {
  const covered = points.filter((p) => p.covered);
  const filings = points.reduce((sum, p) => sum + p.filings, 0);
  const coveredFilings = covered.reduce((sum, p) => sum + p.filings, 0);
  const where = state === "US" ? "Across the U.S." : `In ${stateName(state)}`;
  return (
    <p className="type-body max-w-3xl text-neutral-primary">
      {where}, the unemployed outnumber new H-1B positions in{" "}
      <strong className="font-semibold">
        {fmtInt(covered.length)} of {fmtInt(points.length)}
      </strong>{" "}
      occupation groups, even at the low end of the survey range. Those groups hold{" "}
      <strong className="font-semibold">{fmtPct(coveredFilings, filings)}</strong> of the filings on this chart.
      {hidden > 0 ? ` ${fmtInt(hidden)} groups with no new positions are not shown.` : null}
    </p>
  );
}

export default function OccupationSection({
  cells,
  titles,
  state,
  selectedOcc,
  onSelectOcc,
  onClearState,
}: {
  cells: ExploreLaborCell[];
  titles: Record<string, string>;
  state: string;
  selectedOcc: string | null;
  onSelectOcc: (occ: string | null) => void;
  onClearState: () => void;
}) {
  const [term, setTerm] = useState("");
  const stateCells = useMemo(() => cells.filter((c) => c.state === state), [cells, state]);
  const points = useMemo(() => occupationPoints(stateCells, titles), [stateCells, titles]);
  const matches = useMemo(() => matchOccupations(points, term), [points, term]);
  const build = useCallback(
    (width: number, palette: Palette) => buildOccupationChart({ points, matches, selectedOcc, onSelect: onSelectOcc }, width, palette),
    [points, matches, selectedOcc, onSelectOcc],
  );
  const noSurvey = NO_ACS_STATES.has(state);

  return (
    <ExploreFigure
      controls={
        <>
          <div className="w-full max-w-xs">
            <SearchBox label="Find an occupation" value={term} placeholder="e.g. software, nurse" onChange={setTerm} />
          </div>
          <div className="flex flex-wrap gap-2">
            {state !== "US" ? <FilterChip label={stateName(state)} onClear={onClearState} /> : null}
            {selectedOcc ? <FilterChip label={titles[selectedOcc] ?? selectedOcc} onClear={() => onSelectOcc(null)} /> : null}
          </div>
        </>
      }
      readout={
        noSurvey ? (
          <p className="type-body text-neutral-secondary">The Census survey in this data does not cover {stateName(state)}.</p>
        ) : (
          <Readout points={points} state={state} hidden={stateCells.length - points.length} />
        )
      }
      notes={[
        "Each dot is one Census occupation group. Dot size shows certified H-1B filings. The vertical line shows the survey's 90% range.",
        "Green dots sit above the dashed line even at the low end of the range: the unemployed outnumber new positions. Gray dots do not pass that test.",
        "Click a dot to color the map by that occupation. Both axes use log scales.",
        "A past job in an occupation does not prove that a person can do a specific job. The survey does not measure seniority or specialty.",
      ]}
      source="DOL OFLC LCA disclosure data, FY2025; Census ACS 2024 1-year PUMS with 80 replicate weights; Census 2018 occupation crosswalk."
      method="labor-pool-method.md"
    >
      {noSurvey ? null : (
        <PlotFigure build={build} minHeight={380} label={`Scatter plot: new H-1B positions against unemployed workers by occupation, ${stateName(state)}`} />
      )}
    </ExploreFigure>
  );
}
