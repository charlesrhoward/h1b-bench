import type { Palette } from "@/components/explore/use-palette";

/**
 * A horizontal timeline: stacked bars for each period, dated events on a lane above the bars,
 * shaded spans, and labeled reference lines.
 *
 * The model is plain data. A server page writes every label and tooltip line from its own
 * rows, then passes the model to the client chart, which only draws it. Dates are ISO
 * "YYYY-MM-DD" in UTC.
 */
export type TimelineModel = {
  /** Start (inclusive) and end (exclusive) of the x axis. */
  domain: { start: string; end: string };
  /** Bar series, bottom to top. */
  series: TimelineSeries[];
  /** Sets of series the reader can pick. The first one is the default. */
  views: TimelineView[];
  bins: TimelineBin[];
  events: TimelineEvent[];
  spans: TimelineSpan[];
  markers: TimelineMarker[];
  /** Color of the events and the spans. */
  eventColor: keyof Palette;
  legend: { event: string; hollowEvent: string; span: string };
  /** Label for the y axis. Narrow charts leave it out, so the marker labels have room. */
  yLabel: string;
  /** How many of the largest events get a text label on the chart. */
  labeledEvents: number;
};

export type TimelineSeries = { key: string; label: string; color: keyof Palette };

export type TimelineView = { value: string; label: string; series: string[] };

/** One bar: a period with a value for each series, its tooltip title, and context lines. */
export type TimelineBin = {
  start: string;
  end: string;
  values: Record<string, number>;
  title: string;
  context: string[];
};

/** One dot on the event lane. `size` sets the dot area; null draws the smallest dot. */
export type TimelineEvent = {
  date: string;
  size: number | null;
  label: string;
  tip: string[];
  hollow: boolean;
};

export type TimelineSpan = { start: string; end: string };

/**
 * A dashed reference line. A "start" label reads to the right of the line, an "end" label to the
 * left. Narrow charts show `shortLabel`.
 */
export type TimelineMarker = { date: string; label: string; shortLabel: string; side: "start" | "end" };

/** Chart heights, in pixels. The loading placeholder uses them too, so the page does not jump. */
export const TIMELINE_HEIGHT = { wide: 320, narrow: 260 };

export function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** The series a view shows, in stack order. Unknown views show every series. */
export function viewSeries(model: TimelineModel, view: string): TimelineSeries[] {
  const keys = model.views.find((v) => v.value === view)?.series;
  return keys ? model.series.filter((s) => keys.includes(s.key)) : model.series;
}
