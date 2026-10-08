import * as Plot from "@observablehq/plot";
import { labelMarks, placeLabels, type LabelCandidate } from "@/components/explore/labels";
import { chartStyle, NARROW_WIDTH, tipStyle } from "@/components/explore/plot-theme";
import type { Palette } from "@/components/explore/use-palette";
import { fmtInt } from "@/lib/format";
import {
  TIMELINE_HEIGHT,
  utcDate,
  viewSeries,
  type TimelineBin,
  type TimelineEvent,
  type TimelineModel,
  type TimelineSeries,
} from "./timeline-model";

type Frame = { width: number; height: number; top: number; right: number; bottom: number; left: number };

function frameFor(width: number): Frame {
  const narrow = width < NARROW_WIDTH;
  return { width, height: narrow ? TIMELINE_HEIGHT.narrow : TIMELINE_HEIGHT.wide, top: 34, right: narrow ? 8 : 16, bottom: 28, left: narrow ? 40 : 52 };
}

/** The y layout: bars fill the bottom, and the event lane sits above the tallest bar. */
type Layout = { max: number; lane: number; top: number; ticks: number[] };

/** Round tick values (1, 2, or 5 times a power of ten) from 0 to about `max`. */
function niceTicks(max: number, count = 4): number[] {
  const raw = max / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? raw;
  return Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
}

const binTotal = (bin: TimelineBin, series: TimelineSeries[]) =>
  series.reduce((total, s) => total + (bin.values[s.key] ?? 0), 0);

function layoutFor(bins: TimelineBin[], series: TimelineSeries[]): Layout {
  const max = Math.max(1, ...bins.map((b) => binTotal(b, series)));
  return { max, lane: max * 1.22, top: max * 1.36, ticks: niceTicks(max) };
}

/** One stacked bar segment. */
type Segment = { x1: Date; x2: Date; y1: number; y2: number };

/** Stacked segments for one series, on top of the series before it. */
function segments(bins: TimelineBin[], series: TimelineSeries[], index: number): Segment[] {
  const below = series.slice(0, index);
  const key = series[index].key;
  return bins
    .filter((b) => (b.values[key] ?? 0) > 0)
    .map((b) => {
      const y1 = binTotal(b, below);
      return { x1: utcDate(b.start), x2: utcDate(b.end), y1, y2: y1 + (b.values[key] ?? 0) };
    });
}

function barMarks(bins: TimelineBin[], series: TimelineSeries[], palette: Palette, inset: number) {
  return series.map((s, i) =>
    Plot.rect(segments(bins, series, i), { x1: "x1", x2: "x2", y1: "y1", y2: "y2", fill: palette[s.color], insetLeft: inset }),
  );
}

/** Pointer targets: one per bar (pointed at from the bar's middle) and one per event. */
type Target = { x: Date; y: number; py: number; title: string };

function binTip(bin: TimelineBin, series: TimelineSeries[]): string {
  const rows = series.map((s) => `${s.label}: ${fmtInt(bin.values[s.key] ?? 0)}`);
  return [bin.title, ...rows, ...bin.context].join("\n");
}

function targets(model: TimelineModel, series: TimelineSeries[], layout: Layout): Target[] {
  const mid = (b: TimelineBin) => new Date((utcDate(b.start).getTime() + utcDate(b.end).getTime()) / 2);
  return [
    ...model.bins.map((b) => ({ x: mid(b), y: binTotal(b, series), py: layout.max * 0.4, title: binTip(b, series) })),
    ...model.events.map((e) => ({ x: utcDate(e.date), y: layout.lane, py: layout.lane, title: e.tip.join("\n") })),
  ];
}

function scales(model: TimelineModel, layout: Layout, f: Frame) {
  const sizes = model.events.map((e) => e.size ?? 0);
  return {
    x: { type: "utc", domain: [utcDate(model.domain.start), utcDate(model.domain.end)], range: [f.left, f.width - f.right] },
    y: { type: "linear", domain: [0, layout.top], range: [f.height - f.bottom, f.top] },
    r: { type: "sqrt", domain: [0, Math.max(1, ...sizes)], range: [3, f.width < NARROW_WIDTH ? 10 : 15] },
  } satisfies Record<string, Plot.ScaleOptions>;
}

/** Labels for the largest events, placed so they do not overlap. */
function eventLabels(model: TimelineModel, s: ReturnType<typeof scales>, layout: Layout, f: Frame) {
  const x = Plot.scale({ x: s.x });
  const y = Plot.scale({ y: s.y });
  const r = Plot.scale({ r: s.r });
  const largest = model.events
    .filter((e) => e.size != null && e.label)
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
    .slice(0, model.labeledEvents);
  const candidates: LabelCandidate<TimelineEvent>[] = largest.map((e) => ({
    datum: e,
    text: e.label,
    px: x.apply(utcDate(e.date)),
    py: y.apply(layout.lane),
    radius: r.apply(e.size ?? 0),
  }));
  const placed = placeLabels(candidates, { x0: 0, x1: f.width, y0: f.top - 4, y1: f.height - f.bottom });
  return { placed, radius: (e: TimelineEvent) => r.apply(e.size ?? 0) };
}

function markerMarks(model: TimelineModel, palette: Palette) {
  const line = { x: (m: { date: string }) => utcDate(m.date), stroke: palette.muted, strokeDasharray: "3 3", strokeOpacity: 0.7 };
  const text = { x: (m: { date: string }) => utcDate(m.date), text: "label", frameAnchor: "top" as const, dy: -22, fill: palette.muted, fontSize: 11 };
  return [
    Plot.ruleX(model.markers, line),
    Plot.text(model.markers.filter((m) => m.side === "start"), { ...text, textAnchor: "start", dx: 4 }),
    Plot.text(model.markers.filter((m) => m.side === "end"), { ...text, textAnchor: "end", dx: -4 }),
  ];
}

function eventMarks(model: TimelineModel, layout: Layout, palette: Palette) {
  const color = palette[model.eventColor];
  const at = { x: (e: TimelineEvent) => utcDate(e.date), y: layout.lane, r: (e: TimelineEvent) => e.size ?? 0 };
  return [
    Plot.ruleX(model.events, { x: at.x, y1: 0, y2: layout.lane, stroke: color, strokeOpacity: 0.45 }),
    Plot.dot(model.events.filter((e) => !e.hollow), { ...at, fill: color, fillOpacity: 0.85, stroke: palette.surface, strokeWidth: 1 }),
    Plot.dot(model.events.filter((e) => e.hollow), { ...at, fill: palette.surface, stroke: color, strokeWidth: 1.5 }),
  ];
}

function spanMarks(model: TimelineModel, layout: Layout, palette: Palette) {
  const spans = model.spans.map((s) => ({ x1: utcDate(s.start), x2: utcDate(s.end) }));
  return [Plot.rect(spans, { x1: "x1", x2: "x2", y1: 0, y2: layout.lane, fill: palette[model.eventColor], fillOpacity: 0.12 })];
}

function pointerMarks(points: Target[], layout: Layout, palette: Palette) {
  const pointer = { x: "x", px: "x", py: "py", maxRadius: 400 };
  return [
    Plot.ruleX(points, Plot.pointer({ ...pointer, y1: 0, y2: layout.top, stroke: palette.ink, strokeOpacity: 0.3 })),
    Plot.tip(points, Plot.pointer({ ...pointer, y: "y", title: "title", ...tipStyle(palette) })),
  ];
}

/** The timeline for one view: bars by period, events on a lane above, spans and markers behind. */
export function buildTimeline(model: TimelineModel, view: string, width: number, palette: Palette) {
  if (model.bins.length === 0 && model.events.length === 0) return null;
  const f = frameFor(width);
  const series = viewSeries(model, view);
  const layout = layoutFor(model.bins, series);
  const s = scales(model, layout, f);
  const { placed, radius } = eventLabels(model, s, layout, f);
  const barWidth = (f.width - f.left - f.right) / Math.max(1, model.bins.length);
  return Plot.plot({
    width,
    height: f.height,
    marginTop: f.top,
    marginRight: f.right,
    marginBottom: f.bottom,
    marginLeft: f.left,
    x: { ...s.x, label: null, ticks: "year", tickFormat: "%Y" },
    y: { ...s.y, label: model.yLabel, ticks: layout.ticks, tickFormat: (v: number) => fmtInt(v), grid: true },
    r: s.r,
    style: chartStyle(palette),
    marks: [
      ...spanMarks(model, layout, palette),
      ...barMarks(model.bins, series, palette, barWidth > 6 ? 1 : 0),
      Plot.ruleY([0], { stroke: palette.rule }),
      ...markerMarks(model, palette),
      ...eventMarks(model, layout, palette),
      ...labelMarks(placed, { x: (e) => utcDate(e.date).getTime(), y: () => layout.lane, radius }, { fill: palette.ink, halo: palette.surface }),
      ...pointerMarks(targets(model, series, layout), layout, palette),
    ],
  });
}
