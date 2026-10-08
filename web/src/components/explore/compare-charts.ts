import * as Plot from "@observablehq/plot";
import type { EmployerHistoryRow, ExploreEmployer } from "@/lib/explore-model";
import type { EmployerMetric } from "@/lib/explore-stats";
import { fmtInt } from "@/lib/format";
import { chartStyle, tipStyle } from "./plot-theme";
import type { Palette } from "./use-palette";

/** The newest fiscal year in the LCA data is not complete (through Q3). */
export const PARTIAL_FY = 2026;

type HistoryPoint = EmployerHistoryRow & { name: string };

export type HistoryInputs = {
  rows: EmployerHistoryRow[];
  compared: ExploreEmployer[];
  colors: string[];
};

/** H-1B filings per fiscal year, one line per compared employer. The partial year is dashed. */
export function buildHistoryChart({ rows, compared, colors }: HistoryInputs, width: number, palette: Palette) {
  if (compared.length === 0) return null;
  const names = new Map(compared.map((e) => [e.id, e.name]));
  const points: HistoryPoint[] = rows
    .filter((r) => names.has(r.employer_id))
    .map((r) => ({ ...r, name: names.get(r.employer_id) ?? "" }));
  const full = points.filter((p) => p.fiscal_year < PARTIAL_FY);
  const tail = points.filter((p) => p.fiscal_year >= PARTIAL_FY - 1);
  const color = { domain: compared.map((e) => e.name), range: colors };
  return Plot.plot({
    width,
    height: 300,
    marginLeft: 56,
    marginRight: 20,
    x: { label: null, tickFormat: (y: number) => `FY${y}`, ticks: [2020, 2021, 2022, 2023, 2024, 2025, 2026], domain: [2020, PARTIAL_FY] },
    y: { label: "↑ H-1B LCA filings", grid: true, tickFormat: "~s", zero: true },
    color,
    style: chartStyle(palette),
    marks: [
      Plot.line(full, { x: "fiscal_year", y: "filings", z: "name", stroke: "name", strokeWidth: 2.25, curve: "monotone-x" }),
      Plot.line(tail, { x: "fiscal_year", y: "filings", z: "name", stroke: "name", strokeWidth: 1.5, strokeDasharray: "3 4" }),
      Plot.dot(full, { x: "fiscal_year", y: "filings", fill: "name", r: 3.5 }),
      Plot.dot(points.filter((p) => p.fiscal_year === PARTIAL_FY), { x: "fiscal_year", y: "filings", fill: palette.surface, stroke: "name", strokeWidth: 1.5, r: 3.5 }),
      Plot.tip(points, Plot.pointer({
        x: "fiscal_year",
        y: "filings",
        title: (p: HistoryPoint) => `${p.name}\nFY${p.fiscal_year}${p.fiscal_year === PARTIAL_FY ? " (year to date)" : ""}\nFilings: ${fmtInt(p.filings)}\nCertified: ${fmtInt(p.certified)}`,
        ...tipStyle(palette),
      })),
    ],
  });
}

export type StripInputs = {
  metric: EmployerMetric;
  employers: ExploreEmployer[];
  compared: ExploreEmployer[];
  colors: string[];
};

/**
 * One row of the comparison: every employer as a faint tick, the compared ones as colored
 * dots. It shows where each compared employer sits in the whole field.
 */
export function buildStrip({ metric, employers, compared, colors }: StripInputs, width: number, palette: Palette) {
  const values = employers.map(metric.value).filter((v): v is number => v != null && (!metric.log || v > 0));
  const picks = compared
    .map((e, i) => ({ e, v: metric.value(e), color: colors[i] }))
    .filter((p): p is { e: ExploreEmployer; v: number; color: string } => p.v != null && (!metric.log || p.v > 0));
  return Plot.plot({
    width,
    height: 64,
    marginLeft: 12,
    marginRight: 12,
    marginTop: 8,
    x: { type: metric.log ? "log" : "linear", tickFormat: metric.format, ticks: 5, label: null, nice: true },
    style: chartStyle(palette),
    marks: [
      Plot.tickX(values, { stroke: palette.neutral, strokeOpacity: 0.28 }),
      ...(metric.reference ? [Plot.ruleX([metric.reference.value], { stroke: palette.yellow, strokeDasharray: "4 3", strokeWidth: 1.5 })] : []),
      Plot.dot(picks, { x: "v", r: 6.5, fill: "color", stroke: palette.surface, strokeWidth: 1.5 }),
      Plot.tip(picks, Plot.pointerX({ x: "v", title: (p: { e: ExploreEmployer; v: number }) => `${p.e.name}: ${metric.format(p.v)}`, ...tipStyle(palette) })),
    ],
  });
}
