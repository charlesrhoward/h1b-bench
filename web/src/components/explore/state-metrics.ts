import { fmtInt } from "@/lib/format";
import type { StateMetric } from "@/lib/explore-stats";

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
