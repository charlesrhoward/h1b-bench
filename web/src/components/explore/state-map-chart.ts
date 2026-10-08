import * as Plot from "@observablehq/plot";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import usAtlas from "us-atlas/states-albers-10m.json";
import { fmtInt } from "@/lib/format";
import { stateMetricValue, type StateMetric, type StateSummary } from "@/lib/explore-stats";
import { STATE_BY_FIPS } from "@/lib/us-states";
import { chartStyle, tipStyle } from "./plot-theme";
import { ramp, type Palette } from "./use-palette";

type StateFeature = Feature<Geometry, { name: string }> & { id: string };

// us-atlas ships TopoJSON as plain JSON, so its type must be asserted once here.
const topology = usAtlas as unknown as Topology<{ states: GeometryCollection<{ name: string }>; nation: GeometryCollection }>;
const STATES = (feature(topology, topology.objects.states) as FeatureCollection<Geometry, { name: string }>)
  .features as StateFeature[];
const NATION = feature(topology, topology.objects.nation);
const BORDERS = mesh(topology, topology.objects.states, (a, b) => a !== b);
const MAP_STATES = new Set(STATES.map((f) => STATE_BY_FIPS.get(f.id)?.code));
/** The pre-projected Albers USA frame is 975 × 610. */
const ASPECT = 610 / 975;

export type MetricSpec = {
  label: string;
  legend: string;
  format: (n: number) => string;
};

export const STATE_METRICS: Record<StateMetric, MetricSpec> = {
  filings: { label: "H-1B filings", legend: "Certified H-1B LCA filings", format: fmtInt },
  positions: { label: "New H-1B positions", legend: "New-employment positions on certified filings", format: fmtInt },
  supply: { label: "Unemployed", legend: "Unemployed with a degree, last job in these occupations", format: fmtInt },
  perPosition: {
    label: "Unemployed per position",
    legend: "Unemployed workers per new H-1B position",
    format: (n) => `${n.toFixed(n < 10 ? 1 : 0)}×`,
  },
  coveredShare: {
    label: "Filings the unemployed could cover",
    legend: "Share of filings in occupations where the unemployed outnumber new positions",
    format: (n) => `${n.toFixed(0)}%`,
  },
};

/** Min and max over the states the map draws (50 states and DC), so the map and bars share one domain. */
function mapDomain(summaries: Map<string, StateSummary>, metric: StateMetric): [number, number] | undefined {
  const values: number[] = [];
  for (const s of summaries.values()) {
    const v = MAP_STATES.has(s.code) ? stateMetricValue(s, metric) : null;
    if (v != null && v > 0) values.push(v);
  }
  return values.length ? [Math.min(...values), Math.max(...values)] : undefined;
}

/** Legend ticks for the ratio; the default log ticks crowd together near 1. */
const RATIO_TICKS = [0.5, 1, 2, 5, 10];

/**
 * The color scale for each metric: log for counts, diverging at 1 for the ratio, linear for
 * shares. The map and the ranked bars share it, so a color means the same in both.
 */
export function colorScale(metric: StateMetric, palette: Palette, summaries: Map<string, StateSummary>): Plot.ScaleOptions {
  const spec = STATE_METRICS[metric];
  const domain = mapDomain(summaries, metric);
  const base = { legend: true, label: spec.legend, tickFormat: spec.format, unknown: palette.neutralTertiary, width: 300, ...(domain ? { domain } : {}) };
  if (metric === "perPosition") {
    return { ...base, type: "diverging-log", pivot: 1, symmetric: false, ticks: RATIO_TICKS.filter((t) => !domain || (t >= domain[0] && t <= domain[1])), interpolate: ramp(palette.yellow, palette.neutralTertiary, palette.accent) };
  }
  if (metric === "coveredShare") {
    return { ...base, type: "linear", domain: [0, 100], interpolate: ramp(palette.accentQuaternary, palette.accent) };
  }
  return { ...base, type: "log", interpolate: ramp(palette.accentQuaternary, palette.accent) };
}

/** Tooltip text for one state. Every metric is listed so the reader can compare them. */
export function describeState(s: StateSummary | undefined, name: string): string {
  if (!s) return `${name}\nNo certified H-1B filings in this view`;
  const lines = [
    s.name,
    `H-1B filings: ${fmtInt(s.filings)}`,
    `New positions: ${fmtInt(s.positions)}`,
  ];
  if (s.supply == null) return [...lines, "Unemployed: no ACS data"].join("\n");
  const ratio = stateMetricValue(s, "perPosition");
  const share = stateMetricValue(s, "coveredShare");
  return [
    ...lines,
    `Unemployed, same jobs: ${fmtInt(s.supply)}`,
    `Per new position: ${ratio == null ? "—" : STATE_METRICS.perPosition.format(ratio)}`,
    `Filings they could cover: ${share == null ? "—" : STATE_METRICS.coveredShare.format(share)}`,
  ].join("\n");
}

export type MapInputs = {
  summaries: Map<string, StateSummary>;
  metric: StateMetric;
  selected: string;
  onSelect: (code: string) => void;
};

/** Choropleth of the 50 states and DC. Click a state to select it; click it again to clear. */
export function buildStateMap({ summaries, metric, selected, onSelect }: MapInputs, width: number, palette: Palette) {
  const summaryFor = (f: StateFeature) => summaries.get(STATE_BY_FIPS.get(f.id)?.code ?? "");
  const value = (f: StateFeature) => {
    const s = summaryFor(f);
    return s ? stateMetricValue(s, metric) : null;
  };
  const chosen = STATES.filter((f) => STATE_BY_FIPS.get(f.id)?.code === selected);
  const plot = Plot.plot({
    width,
    height: Math.round(width * ASPECT),
    projection: { type: "identity", domain: NATION },
    color: colorScale(metric, palette, summaries),
    style: chartStyle(palette),
    marks: [
      Plot.geo(STATES, { fill: palette.neutralTertiary }),
      Plot.geo(STATES, { fill: value }),
      Plot.geo(BORDERS, { stroke: palette.surface, strokeWidth: 0.8 }),
      Plot.geo(chosen, { stroke: palette.ink, strokeWidth: 2 }),
      Plot.tip(
        STATES,
        Plot.pointer(
          Plot.centroid({
            title: (f: StateFeature) => describeState(summaryFor(f), f.properties.name),
            ...tipStyle(palette),
          }),
        ),
      ),
    ],
  });
  plot.addEventListener("click", () => {
    const code = STATE_BY_FIPS.get((plot.value as StateFeature | null)?.id ?? "")?.code;
    if (code) onSelect(code === selected ? "US" : code);
  });
  return plot;
}
