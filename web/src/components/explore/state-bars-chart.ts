import * as Plot from "@observablehq/plot";
import { stateMetricValue, type StateMetric, type StateSummary } from "@/lib/explore-stats";
import { chartStyle, tipStyle } from "./plot-theme";
import { STATE_METRICS, colorScale, describeState } from "./state-map-chart";
import type { Palette } from "./use-palette";

/** How many states the ranked list shows. */
const TOP_STATES = 15;

type Ranked = { code: string; name: string; value: number; summary: StateSummary };

/** States ranked by the metric, highest first. The selected state is kept even when it ranks lower. */
export function rankStates(summaries: Map<string, StateSummary>, metric: StateMetric, selected: string): Ranked[] {
  const ranked: Ranked[] = [];
  for (const s of summaries.values()) {
    const value = s.code === "US" ? null : stateMetricValue(s, metric);
    if (value != null) ranked.push({ code: s.code, name: s.name, value, summary: s });
  }
  ranked.sort((a, b) => b.value - a.value);
  const top = ranked.slice(0, TOP_STATES);
  const extra = ranked.find((r) => r.code === selected && !top.includes(r));
  return extra ? [...top, extra] : top;
}

export type BarInputs = {
  summaries: Map<string, StateSummary>;
  metric: StateMetric;
  selected: string;
  onSelect: (code: string) => void;
};

/** Horizontal bars for the top states. Click a bar to select that state. */
export function buildStateBars({ summaries, metric, selected, onSelect }: BarInputs, width: number, palette: Palette) {
  const rows = rankStates(summaries, metric, selected);
  const spec = STATE_METRICS[metric];
  const plot = Plot.plot({
    width,
    height: rows.length * 22 + 36,
    marginLeft: 36,
    marginRight: 52,
    x: { axis: null, insetRight: 4, ...(metric === "perPosition" ? { type: "log" as const } : {}) },
    y: { label: null, domain: rows.map((r) => r.code), tickSize: 0 },
    color: { ...colorScale(metric, palette, summaries), legend: false },
    style: chartStyle(palette),
    marks: [
      Plot.barX(rows, {
        // The ratio is drawn on a log scale from its pivot of 1, so bars below 1 point left.
        ...(metric === "perPosition" ? { x1: 1, x2: "value" } : { x: "value" }),
        y: "code",
        fill: "value",
        stroke: (r: Ranked) => (r.code === selected ? palette.ink : "none"),
        strokeWidth: 2,
      }),
      Plot.text(rows, {
        x: "value",
        y: "code",
        text: (r: Ranked) => spec.format(r.value),
        textAnchor: "start",
        dx: 4,
        fill: palette.ink,
        fontVariant: "tabular-nums",
      }),
      ...(metric === "perPosition" ? [Plot.ruleX([1], { stroke: palette.muted, strokeDasharray: "3 3" })] : []),
      Plot.tip(rows, Plot.pointerY({ x: "value", y: "code", title: (r: Ranked) => describeState(r.summary, r.name), ...tipStyle(palette) })),
    ],
  });
  plot.addEventListener("click", () => {
    const row = plot.value as Ranked | null;
    if (row) onSelect(row.code === selected ? "US" : row.code);
  });
  return plot;
}
