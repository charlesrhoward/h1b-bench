import { NO_ACS_STATES, type ExploreEmployer, type ExploreLaborCell } from "./explore-model";
import { fmtCompact, fmtInt, fmtMoney } from "./format";
import { stateName } from "./us-states";

/** Totals for one state (or the whole country), optionally for one occupation group only. */
export type StateSummary = {
  code: string;
  name: string;
  filings: number;
  positions: number;
  /** Sum of the occupation estimates. Null where ACS has no data. */
  supply: number | null;
  /** Filings in occupation groups where the unemployed lower bound is at least the new positions. */
  coveredFilings: number | null;
  groups: number;
  coveredGroups: number | null;
};

export type StateMetric = "filings" | "positions" | "supply" | "perPosition" | "coveredShare";

/** Unemployed workers per new H-1B position, or null when either side is missing or zero. */
export function perPosition(s: Pick<StateSummary, "supply" | "positions">): number | null {
  if (s.supply == null || s.positions === 0 || s.supply === 0) return null;
  return s.supply / s.positions;
}

/** Percent of filings in covered occupation groups, or null without ACS data. */
export function coveredShare(s: Pick<StateSummary, "coveredFilings" | "filings">): number | null {
  if (s.coveredFilings == null || s.filings === 0) return null;
  return (s.coveredFilings / s.filings) * 100;
}

export function stateMetricValue(s: StateSummary, metric: StateMetric): number | null {
  if (metric === "perPosition") return perPosition(s);
  if (metric === "coveredShare") return coveredShare(s);
  if (metric === "supply") return s.supply || null;
  return s[metric] || null;
}

function emptySummary(code: string): StateSummary {
  const surveyed = !NO_ACS_STATES.has(code);
  return {
    code,
    name: stateName(code),
    filings: 0,
    positions: 0,
    supply: surveyed ? 0 : null,
    coveredFilings: surveyed ? 0 : null,
    groups: 0,
    coveredGroups: surveyed ? 0 : null,
  };
}

function addCell(sum: StateSummary, cell: ExploreLaborCell) {
  sum.filings += cell.filings;
  sum.positions += cell.positions;
  sum.groups += 1;
  if (sum.supply == null || sum.coveredFilings == null || sum.coveredGroups == null) return;
  sum.supply += cell.supply ?? 0;
  if (!cell.covered) return;
  sum.coveredFilings += cell.filings;
  sum.coveredGroups += 1;
}

/** One summary per state code ("US" included), from the labor-pool cells, optionally for one occupation. */
export function summarizeStates(cells: ExploreLaborCell[], occ: string | null): Map<string, StateSummary> {
  const byState = new Map<string, StateSummary>();
  for (const cell of cells) {
    if (occ && cell.occ !== occ) continue;
    const sum = byState.get(cell.state) ?? emptySummary(cell.state);
    addCell(sum, cell);
    byState.set(cell.state, sum);
  }
  return byState;
}

/** A plotted employer metric: how to read it, label it, and format it. */
export type EmployerMetric = {
  key: string;
  label: string;
  axis: string;
  value: (e: ExploreEmployer) => number | null;
  format: (n: number) => string;
  /** Shorter format for axis ticks; defaults to `format`. */
  tick?: (n: number) => string;
  log?: boolean;
  /** A reference value worth a rule on the chart, with its label. */
  reference?: { value: number; label: string };
};

const fmtSignedMoney = (n: number) => (n === 0 ? "$0" : `${n < 0 ? "−" : "+"}${fmtMoney(Math.abs(n))}`);
const fmtPercent = (n: number) => `${n.toFixed(n < 10 ? 1 : 0)}%`;

export const EMPLOYER_METRICS = {
  filings: {
    key: "filings",
    label: "H-1B filings",
    axis: "H-1B LCA filings, FY2025",
    value: (e) => e.filings,
    format: (n) => fmtInt(n),
    tick: (n) => fmtCompact(n),
    log: true,
  },
  medianWage: {
    key: "medianWage",
    label: "Median offered pay",
    axis: "Median offered pay",
    value: (e) => e.medianWage,
    format: (n) => `$${fmtCompact(n)}`,
  },
  workforcePct: {
    key: "workforcePct",
    label: "% of workforce (approx.)",
    axis: "Certified LCAs as % of reported headcount (approx.)",
    value: (e) => e.workforcePct,
    format: fmtPercent,
    log: true,
  },
  belowMedianPct: {
    key: "belowMedianPct",
    label: "% below local median",
    axis: "Filings that offer less than the local median",
    value: (e) => e.belowMedianPct,
    format: fmtPercent,
    reference: { value: 50, label: "Half of filings" },
  },
  medianGap: {
    key: "medianGap",
    label: "Median gap to local median",
    axis: "Median of offered pay minus local median",
    value: (e) => e.medianGap,
    format: fmtSignedMoney,
    tick: (n) => (n === 0 ? "$0" : `${n < 0 ? "−" : "+"}$${fmtCompact(Math.abs(n))}`),
    reference: { value: 0, label: "Local median" },
  },
} satisfies Record<string, EmployerMetric>;

export type EmployerMetricKey = keyof typeof EMPLOYER_METRICS;

/** Middle value of a list of numbers, or null when the list is empty. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
