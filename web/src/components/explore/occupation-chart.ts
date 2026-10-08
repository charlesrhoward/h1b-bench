import * as Plot from "@observablehq/plot";
import type { ExploreLaborCell } from "@/lib/explore-model";
import { fmtCompact, fmtInt } from "@/lib/format";
import { labelMarks, placeLabels, shorten, type LabelCandidate } from "./labels";
import { chartStyle, NARROW_WIDTH, tipStyle } from "./plot-theme";
import type { Palette } from "./use-palette";

/** One occupation group in the chosen state, ready to plot. */
export type OccupationPoint = {
  occ: string;
  title: string;
  filings: number;
  positions: number;
  supply: number;
  low: number;
  high: number;
  covered: boolean;
};

/** Labels drawn on the chart: the largest groups by filings, plus the selection and search matches. */
const LABELED_LARGEST = 8;
const MAX_MATCH_LABELS = 10;

/** Cells with new positions and survey data become points. Cells without either cannot be placed. */
export function occupationPoints(cells: ExploreLaborCell[], titles: Record<string, string>): OccupationPoint[] {
  const points: OccupationPoint[] = [];
  for (const c of cells) {
    if (c.supply == null || c.moe == null || c.positions === 0) continue;
    points.push({
      occ: c.occ,
      title: titles[c.occ] ?? c.occ,
      filings: c.filings,
      positions: c.positions,
      supply: c.supply,
      low: Math.max(c.supply - c.moe, 0),
      high: c.supply + c.moe,
      covered: c.covered,
    });
  }
  return points.sort((a, b) => b.filings - a.filings);
}

function describe(p: OccupationPoint): string {
  return [
    p.title,
    `H-1B filings: ${fmtInt(p.filings)}`,
    `New H-1B positions: ${fmtInt(p.positions)}`,
    `Unemployed: ${fmtInt(p.supply)} (90% range ${fmtInt(p.low)} to ${fmtInt(p.high)})`,
    p.covered ? "The unemployed outnumber new positions, even at the low end." : "The low end of the unemployed count is below new positions.",
  ].join("\n");
}

/** Points that match the search term, by occupation title. */
export function matchOccupations(points: OccupationPoint[], term: string): OccupationPoint[] {
  const needle = term.trim().toLowerCase();
  if (needle.length < 2) return [];
  return points.filter((p) => p.title.toLowerCase().includes(needle));
}

/**
 * Where a zero unemployed count sits. A log axis has no zero, so zero gets its own row below
 * the lowest tick, with a tick labeled "0".
 */
const ZERO_ROW = 0.4;
const yOf = (v: number) => (v > 0 ? v : ZERO_ROW);
const POWER_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];
// d3 blanks log-axis labels that are not powers of ten, so the zero row gets its own text mark.
const fmtTick = (v: number) => fmtCompact(v);

export type OccupationInputs = {
  points: OccupationPoint[];
  matches: OccupationPoint[];
  selectedOcc: string | null;
  onSelect: (occ: string | null) => void;
};

type Frame = { width: number; height: number; top: number; right: number; bottom: number; left: number };

function scales(points: OccupationPoint[], f: Frame) {
  const max = Math.max(10, ...points.map((p) => Math.max(p.positions, p.high)));
  return {
    x: { type: "log", domain: [1, max], nice: true, range: [f.left, f.width - f.right] },
    y: { type: "log", domain: [ZERO_ROW, max], nice: false, range: [f.height - f.bottom, f.top] },
    r: { type: "sqrt", domain: [0, Math.max(1, ...points.map((p) => p.filings))], range: [0, f.width < NARROW_WIDTH ? 14 : 22] },
  } satisfies Record<string, Plot.ScaleOptions>;
}

function labels(inputs: OccupationInputs, s: ReturnType<typeof scales>, f: Frame) {
  const x = Plot.scale({ x: s.x });
  const y = Plot.scale({ y: s.y });
  const r = Plot.scale({ r: s.r });
  const forced = [...inputs.points.filter((p) => p.occ === inputs.selectedOcc), ...inputs.matches.slice(0, MAX_MATCH_LABELS)];
  const candidates: LabelCandidate<OccupationPoint>[] = [...new Set([...forced, ...inputs.points.slice(0, LABELED_LARGEST)])].map((p) => ({
    datum: p,
    text: shorten(p.title),
    px: x.apply(p.positions),
    py: y.apply(yOf(p.supply)),
    radius: r.apply(p.filings),
    force: forced.includes(p),
  }));
  return {
    placed: placeLabels(candidates, { x0: 0, x1: f.width, y0: 0, y1: f.height - f.bottom }),
    radius: (p: OccupationPoint) => r.apply(p.filings),
  };
}

/** New H-1B positions (x) against unemployed workers (y), one dot per occupation group. Both axes are log. */
export function buildOccupationChart(inputs: OccupationInputs, width: number, palette: Palette) {
  const { points, matches, selectedOcc, onSelect } = inputs;
  if (points.length === 0) return null;
  const narrow = width < NARROW_WIDTH;
  const f: Frame = { width, height: narrow ? 400 : 520, top: 28, right: narrow ? 12 : 24, bottom: 36, left: 52 };
  const s = scales(points, f);
  const { placed, radius } = labels(inputs, s, f);
  const max = s.x.domain[1];
  const yTicks = [ZERO_ROW, ...POWER_TICKS.filter((t) => t <= s.y.domain[1])];
  const marked = new Set([...matches, ...points.filter((p) => p.occ === selectedOcc)]);
  const xy = { x: "positions", y: (p: OccupationPoint) => yOf(p.supply), r: "filings" };
  const plot = Plot.plot({
    width,
    height: f.height,
    marginTop: f.top,
    marginRight: f.right,
    marginBottom: f.bottom,
    marginLeft: f.left,
    x: { ...s.x, label: "New H-1B positions →", tickFormat: fmtCompact, ticks: POWER_TICKS.filter((t) => t <= max), grid: true },
    y: { ...s.y, label: "↑ Unemployed with this job history", tickFormat: fmtTick, ticks: yTicks, grid: true },
    r: s.r,
    style: chartStyle(palette),
    marks: [
      Plot.ruleY([Math.sqrt(ZERO_ROW)], { stroke: palette.rule, strokeDasharray: "2 3" }),
      Plot.text([ZERO_ROW], { y: (v: number) => v, frameAnchor: "left", text: () => "0", textAnchor: "end", dx: -9, fill: palette.muted }),
      Plot.line([[1, 1], [max, max]], { stroke: palette.yellow, strokeWidth: 1.5, strokeDasharray: "5 4" }),
      Plot.text([[1, 1]], { text: () => "Unemployed = new positions", textAnchor: "start", dx: 6, dy: -8, rotate: 0, fill: palette.muted }),
      Plot.ruleX(points, { x: "positions", y1: (p: OccupationPoint) => yOf(p.low), y2: (p: OccupationPoint) => yOf(p.high), stroke: palette.neutral, strokeOpacity: 0.2 }),
      Plot.dot(points, { ...xy, fill: (p: OccupationPoint) => (p.covered ? palette.accent : palette.neutral), fillOpacity: 0.75, stroke: palette.surface, strokeWidth: 0.6 }),
      Plot.dot([...marked], { ...xy, stroke: palette.ink, strokeWidth: (p: OccupationPoint) => (p.occ === selectedOcc ? 2.5 : 1.2) }),
      ...labelMarks(placed, { x: (p) => p.positions, y: (p) => yOf(p.supply), radius }, { fill: palette.ink, halo: palette.surface }),
      Plot.tip(points, Plot.pointer({ x: "positions", y: (p: OccupationPoint) => yOf(p.supply), title: describe, ...tipStyle(palette) })),
    ],
  });
  plot.addEventListener("click", () => {
    const point = plot.value as OccupationPoint | null;
    if (point) onSelect(point.occ === selectedOcc ? null : point.occ);
  });
  return plot;
}
