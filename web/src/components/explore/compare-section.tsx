"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { EmployerHistoryRow, ExploreEmployer } from "@/lib/explore-model";
import { EMPLOYER_METRICS, type EmployerMetric } from "@/lib/explore-stats";
import { buildHistoryChart, buildStrip } from "./compare-charts";
import { COMPARE_SWATCHES } from "./compare-colors";
import CompareTable from "./compare-table";
import { SearchBox } from "./controls";
import ExploreFigure from "./explore-figure";
import PlotFigure from "./plot-figure";
import type { Palette } from "./use-palette";

const STRIP_METRICS: EmployerMetric[] = [
  EMPLOYER_METRICS.filings,
  EMPLOYER_METRICS.medianWage,
  EMPLOYER_METRICS.belowMedianPct,
  EMPLOYER_METRICS.medianGap,
  EMPLOYER_METRICS.workforcePct,
];
const MAX_SUGGESTIONS = 6;

/** Fetches FY2020–FY2026 filings for the compared employers. Rows stay empty until the response arrives. */
function useHistory(ids: number[]) {
  const key = ids.join(",");
  const [state, setState] = useState<{ key: string; rows: EmployerHistoryRow[]; failed: boolean }>({ key: "", rows: [], failed: false });
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/employer-history?ids=${key}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((body: { rows: EmployerHistoryRow[] }) => setState({ key, rows: body.rows, failed: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setState({ key, rows: [], failed: true });
      });
    return () => controller.abort();
  }, [key]);
  return { rows: state.key === key ? state.rows : [], failed: state.key === key && state.failed, loading: state.key !== key };
}

function AddEmployer({ employers, compared, onAdd }: { employers: ExploreEmployer[]; compared: ExploreEmployer[]; onAdd: (e: ExploreEmployer) => void }) {
  const [term, setTerm] = useState("");
  const suggestions = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (needle.length < 2) return [];
    const taken = new Set(compared.map((e) => e.id));
    return employers
      .filter((e) => !taken.has(e.id) && e.name.toLowerCase().includes(needle))
      .sort((a, b) => b.filings - a.filings)
      .slice(0, MAX_SUGGESTIONS);
  }, [employers, compared, term]);
  return (
    <div className="relative w-full max-w-xs">
      <SearchBox label="Add an employer" value={term} placeholder="Type a name" onChange={setTerm} />
      {suggestions.length > 0 ? (
        <ul className="shadow-elevated absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-neutral-tertiary bg-neutral-elevated text-[13px]">
          {suggestions.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => { onAdd(e); setTerm(""); }}
                className="w-full px-3 py-2 text-left text-neutral-primary hover:bg-neutral-secondary">
                {e.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function CompareSection({
  employers,
  compared,
  colors,
  onAdd,
  onRemove,
}: {
  employers: ExploreEmployer[];
  compared: ExploreEmployer[];
  colors: string[];
  onAdd: (employer: ExploreEmployer) => void;
  onRemove: (id: number) => void;
}) {
  const ids = useMemo(() => compared.map((e) => e.id), [compared]);
  const history = useHistory(ids);
  const historyChart = useCallback(
    (width: number, palette: Palette) => buildHistoryChart({ rows: history.rows, compared, colors: colors.length ? colors : [palette.accent] }, width, palette),
    [history.rows, compared, colors],
  );

  return (
    <ExploreFigure
      controls={
        <>
          <AddEmployer employers={employers} compared={compared} onAdd={onAdd} />
          <ul className="flex flex-wrap gap-2" aria-label="Compared employers">
            {compared.map((e, i) => (
              <li key={e.id}>
                <button type="button" onClick={() => onRemove(e.id)} aria-label={`Remove ${e.name}`}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-tertiary px-3 py-1 text-[13px] text-neutral-primary hover:border-neutral-tertiary-hover">
                  <span aria-hidden className={`size-2.5 rounded-full ${COMPARE_SWATCHES[i]}`} />
                  {e.name}
                  <span aria-hidden className="text-neutral-secondary">×</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      }
      readout={
        compared.length === 0 ? (
          <p className="type-body text-neutral-secondary">Add up to three employers. Click a dot in the chart above, or search by name.</p>
        ) : null
      }
      notes={[
        "Up to three employers. A new pick replaces the oldest one.",
        "FY2026 covers October 2025 to June 2026 only, so its point is hollow and its line is dashed.",
        "In each strip, the gray ticks are all employers with at least 25 H-1B filings in FY2025. The dashed line is the reference value: half of filings, or the local median.",
      ]}
      source="DOL OFLC LCA disclosure data, FY2020 to FY2026 Q3; the sources listed for the employer chart."
      method="market-gap-method.md"
    >
      {compared.length === 0 ? null : (
        <div className="space-y-10">
          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-secondary">
              H-1B filings by fiscal year{history.loading ? " (loading…)" : ""}
              {history.failed ? " — could not load the history. Try again later." : ""}
            </p>
            <PlotFigure build={historyChart} minHeight={300} label="Line chart of H-1B filings by fiscal year for the compared employers" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-secondary">Where each employer sits among all employers, FY2025</p>
            {STRIP_METRICS.map((metric) => (
              <StripRow key={metric.key} metric={metric} employers={employers} compared={compared} colors={colors} />
            ))}
          </div>
          <CompareTable compared={compared} />
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {compared.map((e) => (
              <Link key={e.id} href={`/employers/${e.id}`} className="link">
                {e.name}: full employer page
              </Link>
            ))}
          </p>
        </div>
      )}
    </ExploreFigure>
  );
}

function StripRow({ metric, employers, compared, colors }: { metric: EmployerMetric; employers: ExploreEmployer[]; compared: ExploreEmployer[]; colors: string[] }) {
  const build = useCallback(
    (width: number, palette: Palette) => buildStrip({ metric, employers, compared, colors }, width, palette),
    [metric, employers, compared, colors],
  );
  return (
    <div className="grid items-center gap-x-6 border-b border-neutral-primary py-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
      <span className="text-sm text-neutral-primary">{metric.label}</span>
      <PlotFigure build={build} minHeight={64} label={`Strip chart: ${metric.label} for all employers, compared employers marked`} />
    </div>
  );
}
