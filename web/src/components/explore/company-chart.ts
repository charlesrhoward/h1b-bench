import * as Plot from "@observablehq/plot";
import type { ExploreEmployer } from "@/lib/explore-model";
import { EMPLOYER_METRICS, type EmployerMetric, type EmployerMetricKey } from "@/lib/explore-stats";
import { fmtInt, fmtMoney } from "@/lib/format";
import { labelMarks, placeLabels, shorten, type LabelCandidate } from "./labels";
import { chartStyle, NARROW_WIDTH, tipStyle } from "./plot-theme";
import type { Palette } from "./use-palette";

/** A plotted employer: the record plus its x and y values. */
export type CompanyPoint = { e: ExploreEmployer; x: number; y: number };

/** Employers that have both metrics. Employers missing either value are left out, not set to zero. */
export function companyPoints(employers: ExploreEmployer[], xKey: EmployerMetricKey, yKey: EmployerMetricKey): CompanyPoint[] {
  const xm: EmployerMetric = EMPLOYER_METRICS[xKey];
  const ym: EmployerMetric = EMPLOYER_METRICS[yKey];
  const points: CompanyPoint[] = [];
  for (const e of employers) {
    const x = xm.value(e);
    const y = ym.value(e);
    if (x == null || y == null || (xm.log && x <= 0)) continue;
    points.push({ e, x, y });
  }
  return points;
}

function optional(label: string, value: string | null): string[] {
  return value == null ? [] : [`${label}: ${value}`];
}

/** Tooltip text: every fact the explorer has for the employer, missing ones left out. */
export function describeEmployer(e: ExploreEmployer): string {
  const m = EMPLOYER_METRICS;
  return [
    e.name,
    `H-1B filings: ${fmtInt(e.filings)}`,
    ...optional("Median offered pay", e.medianWage == null ? null : fmtMoney(e.medianWage)),
    ...optional("Below local median", e.belowMedianPct == null ? null : `${m.belowMedianPct.format(e.belowMedianPct)} of ${fmtInt(e.gapMatched)} matched`),
    ...optional("Median gap", e.medianGap == null ? null : m.medianGap.format(e.medianGap)),
    ...optional("Workforce (approx.)", e.workforcePct == null ? null : m.workforcePct.format(e.workforcePct)),
    ...optional("Back wages owed (WHD)", e.backWages == null ? null : fmtMoney(e.backWages)),
    ...optional("Laid off, then filed (WARN)", e.laidOff == null ? null : `${fmtInt(e.laidOff)} laid off in ${e.warnStates}; ${fmtInt(e.filingsAfterLayoff)} new H-1B filings in the next 12 months`),
    "Click to compare",
  ].join("\n");
}

export type CompanyInputs = {
  points: CompanyPoint[];
  xKey: EmployerMetricKey;
  yKey: EmployerMetricKey;
  showBackWages: boolean;
  showLayoffs: boolean;
  matches: Set<number>;
  compared: ExploreEmployer[];
  compareColors: string[];
  onPick: (employer: ExploreEmployer) => void;
};

type Frame = { width: number; height: number; top: number; right: number; bottom: number; left: number };

function frameFor(width: number): Frame {
  const narrow = width < NARROW_WIDTH;
  return { width, height: narrow ? 420 : 560, top: 28, right: narrow ? 12 : 28, bottom: 36, left: 56 };
}

function extent(values: number[], reference?: number): [number, number] {
  const all = reference == null ? values : [...values, reference];
  return [Math.min(...all), Math.max(...all)];
}

/** Scale options shared by the chart and the label layout, so both place a value at the same pixel. */
function scales(points: CompanyPoint[], xm: EmployerMetric, ym: EmployerMetric, f: Frame) {
  const maxR = f.width < NARROW_WIDTH ? 12 : 18;
  return {
    x: { type: xm.log ? "log" : "linear", domain: extent(points.map((p) => p.x)), nice: true, range: [f.left, f.width - f.right] },
    y: { type: ym.log ? "log" : "linear", domain: extent(points.map((p) => p.y), ym.reference?.value), nice: true, range: [f.height - f.bottom, f.top] },
    r: { type: "sqrt", domain: [0, Math.max(1, ...points.map(size))], range: [1.6, maxR] },
  } satisfies Record<string, Plot.ScaleOptions>;
}

/** Dot area: worker positions, or filings when positions are missing. */
const size = (p: CompanyPoint) => p.e.workers ?? p.e.filings;

const FORCED_MATCHES = 3;

/** Labels for search matches, placed so they do not overlap. */
function labels(inputs: CompanyInputs, s: ReturnType<typeof scales>, f: Frame) {
  const x = Plot.scale({ x: s.x });
  const y = Plot.scale({ y: s.y });
  const r = Plot.scale({ r: s.r });
  // Names show on hover. Only employers that match the search box keep a label on the chart.
  const matched = inputs.points.filter((p) => inputs.matches.has(p.e.id));
  const candidates: LabelCandidate<CompanyPoint>[] = matched.map((p) => ({
    datum: p,
    text: shorten(p.e.name),
    px: x.apply(p.x),
    py: y.apply(p.y),
    radius: r.apply(size(p)),
    // A narrow search (a few matches) always labels them; a broad one labels what fits.
    force: matched.length <= FORCED_MATCHES,
  }));
  const placed = placeLabels(candidates, { x0: 0, x1: f.width, y0: 0, y1: f.height - f.bottom });
  return { placed, radius: (p: CompanyPoint) => r.apply(size(p)) };
}

function referenceMarks(metric: EmployerMetric, palette: Palette) {
  if (!metric.reference) return [];
  const ref = metric.reference;
  return [
    Plot.ruleY([ref.value], { stroke: palette.yellow, strokeWidth: 1.5, strokeDasharray: "5 4" }),
    Plot.text([ref.value], { y: (v: number) => v, frameAnchor: "left", textAnchor: "start", text: () => ref.label, dx: 4, dy: -7, fill: palette.muted }),
  ];
}

/** One dot per employer: x and y are the chosen metrics, area is worker positions. */
export function buildCompanyChart(inputs: CompanyInputs, width: number, palette: Palette) {
  const { points, compared, compareColors } = inputs;
  const xm: EmployerMetric = EMPLOYER_METRICS[inputs.xKey];
  const ym: EmployerMetric = EMPLOYER_METRICS[inputs.yKey];
  if (points.length === 0) return null;
  const f = frameFor(width);
  const s = scales(points, xm, ym, f);
  const { placed, radius } = labels(inputs, s, f);
  const colorOf = new Map(compared.map((e, i) => [e.id, compareColors[i]]));
  const xy = { x: "x", y: "y", r: size };
  const plot = Plot.plot({
    width,
    height: f.height,
    marginTop: f.top,
    marginRight: f.right,
    marginBottom: f.bottom,
    marginLeft: f.left,
    x: { ...s.x, label: `${xm.axis} →`, tickFormat: xm.tick ?? xm.format, ticks: 6, grid: true },
    y: { ...s.y, label: `↑ ${ym.axis}`, tickFormat: ym.tick ?? ym.format, ticks: 5, grid: true },
    r: s.r,
    style: chartStyle(palette),
    marks: [
      ...referenceMarks(ym, palette),
      Plot.dot(points, { ...xy, fill: palette.neutral, fillOpacity: 0.5 }),
      Plot.dot(points.filter((p) => inputs.showBackWages && p.e.backWages != null), { ...xy, fill: palette.yellow, fillOpacity: 0.9 }),
      Plot.dot(points.filter((p) => inputs.showLayoffs && p.e.laidOff != null), { ...xy, stroke: palette.ink, strokeWidth: 1.5 }),
      Plot.dot(points.filter((p) => inputs.matches.has(p.e.id)), { ...xy, stroke: palette.ink, strokeWidth: 1 }),
      Plot.dot(points.filter((p) => colorOf.has(p.e.id)), { ...xy, fill: (p: CompanyPoint) => colorOf.get(p.e.id), stroke: palette.ink, strokeWidth: 2 }),
      ...labelMarks(placed, { x: (p) => p.x, y: (p) => p.y, radius }, { fill: palette.ink, halo: palette.surface }),
      Plot.tip(points, Plot.pointer({ x: "x", y: "y", title: (p: CompanyPoint) => describeEmployer(p.e), ...tipStyle(palette) })),
    ],
  });
  plot.addEventListener("click", () => {
    const point = plot.value as CompanyPoint | null;
    if (point) inputs.onPick(point.e);
  });
  return plot;
}
