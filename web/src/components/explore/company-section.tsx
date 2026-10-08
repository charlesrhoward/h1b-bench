"use client";

import { useCallback, useMemo, useState } from "react";
import type { ExploreEmployer } from "@/lib/explore-model";
import { EMPLOYER_METRICS, median, type EmployerMetricKey } from "@/lib/explore-stats";
import { fmtInt, fmtPct } from "@/lib/format";
import { SOC_MAJOR_GROUPS, socMajorGroup } from "@/lib/soc-groups";
import { stateName } from "@/lib/us-states";
import { buildCompanyChart, companyPoints } from "./company-chart";
import { FilterChip, Range, SearchBox, Segmented, Toggle, type Choice } from "./controls";
import ExploreFigure from "./explore-figure";
import PlotFigure from "./plot-figure";
import type { Palette } from "./use-palette";

const X_CHOICES: Choice<EmployerMetricKey>[] = (["filings", "workforcePct", "medianWage"] as const).map((value) => ({
  value,
  label: EMPLOYER_METRICS[value].label,
}));
const Y_CHOICES: Choice<EmployerMetricKey>[] = (["belowMedianPct", "medianGap", "medianWage"] as const).map((value) => ({
  value,
  label: EMPLOYER_METRICS[value].label,
}));
/** Slider stops for the minimum filings filter. */
const MIN_FILINGS_STEPS = [25, 50, 100, 250, 500, 1000, 2500];
/** The occupation-group filter lists this many of the most common groups. */
const GROUP_CHOICES = 5;

function groupChoices(employers: ExploreEmployer[]): Choice<string>[] {
  const counts = new Map<string, number>();
  for (const e of employers) {
    const group = socMajorGroup(e.topSoc);
    if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, GROUP_CHOICES);
  return [{ value: "all", label: "All" }, ...top.map(([value]) => ({ value, label: SOC_MAJOR_GROUPS[value] }))];
}

type Filters = { state: string; group: string; minFilings: number };

function applyFilters(employers: ExploreEmployer[], { state, group, minFilings }: Filters) {
  return employers.filter(
    (e) =>
      e.filings >= minFilings &&
      (state === "US" || e.topState === state) &&
      (group === "all" || socMajorGroup(e.topSoc) === group),
  );
}

function Readout({ employers }: { employers: ExploreEmployer[] }) {
  const shares = employers.map((e) => e.belowMedianPct).filter((v): v is number => v != null);
  const majority = shares.filter((v) => v > 50).length;
  const gap = median(employers.map((e) => e.medianGap).filter((v): v is number => v != null));
  if (shares.length === 0) return <p className="type-body text-neutral-secondary">No employers match these filters.</p>;
  return (
    <p className="type-body max-w-3xl text-neutral-primary">
      <strong className="font-semibold">{fmtInt(majority)}</strong> of {fmtInt(shares.length)} employers in this view (
      {fmtPct(majority, shares.length)}) offer less than the local median on more than half of their matched filings.
      {gap == null ? null : <> The middle employer&apos;s median gap is <strong className="font-semibold">{EMPLOYER_METRICS.medianGap.format(gap)}</strong>.</>}
    </p>
  );
}

export type CompanySectionProps = {
  employers: ExploreEmployer[];
  state: string;
  compared: ExploreEmployer[];
  compareColors: string[];
  onPick: (employer: ExploreEmployer) => void;
  onClearState: () => void;
};

export default function CompanySection({ employers, state, compared, compareColors, onPick, onClearState }: CompanySectionProps) {
  const [xKey, setXKey] = useState<EmployerMetricKey>("filings");
  const [yKey, setYKey] = useState<EmployerMetricKey>("belowMedianPct");
  const [group, setGroup] = useState("all");
  const [minStep, setMinStep] = useState(0);
  const [term, setTerm] = useState("");
  const [showBackWages, setShowBackWages] = useState(true);
  const [showLayoffs, setShowLayoffs] = useState(true);
  const groups = useMemo(() => groupChoices(employers), [employers]);
  const filtered = useMemo(
    () => applyFilters(employers, { state, group, minFilings: MIN_FILINGS_STEPS[minStep] }),
    [employers, state, group, minStep],
  );
  const points = useMemo(() => companyPoints(filtered, xKey, yKey), [filtered, xKey, yKey]);
  const matches = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return new Set(needle.length < 2 ? [] : filtered.filter((e) => e.name.toLowerCase().includes(needle)).map((e) => e.id));
  }, [filtered, term]);
  const build = useCallback(
    (width: number, palette: Palette) =>
      buildCompanyChart({ points, xKey, yKey, showBackWages, showLayoffs, matches, compared, compareColors, onPick }, width, palette),
    [points, xKey, yKey, showBackWages, showLayoffs, matches, compared, compareColors, onPick],
  );

  return (
    <ExploreFigure
      controls={
        <>
          <Segmented label="Across" value={xKey} choices={X_CHOICES} onChange={setXKey} />
          <Segmented label="Up" value={yKey} choices={Y_CHOICES} onChange={setYKey} />
          <Segmented label="Top occupation group" value={group} choices={groups} onChange={setGroup} />
          <div className="w-full max-w-56">
            <Range label="At least this many filings" value={minStep} min={0} max={MIN_FILINGS_STEPS.length - 1} step={1}
              format={(i) => fmtInt(MIN_FILINGS_STEPS[i])} onChange={setMinStep} />
          </div>
          <div className="w-full max-w-xs">
            <SearchBox label="Find an employer" value={term} placeholder="e.g. Cognizant, Amazon" onChange={setTerm} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Toggle label="Owed back wages" checked={showBackWages} swatch="bg-chart-yellow-primary" onChange={setShowBackWages} />
            <Toggle label="Filed layoff notices" checked={showLayoffs} swatch="border-2 border-current" onChange={setShowLayoffs} />
            {state !== "US" ? <FilterChip label={`Top worksite: ${stateName(state)}`} onClear={onClearState} /> : null}
          </div>
        </>
      }
      readout={<Readout employers={filtered} />}
      notes={[
        `Each dot is one employer with at least ${fmtInt(MIN_FILINGS_STEPS[minStep])} H-1B LCA filings in FY2025. Dot size shows worker positions. Point at a dot to see the employer. Click it to add it to the comparison below.`,
        "The local median is DOL's Level III wage for the job and area. Offered pay is the bottom of the offered range. An employer can pay more.",
        "An employer's share below the local median shows only when at least 10 of its filings matched a local wage.",
        "Yellow: H-1B back wages that employers agreed to pay after a WHD case, all years since FY2005. Ring: WARN layoff notices in Texas or California, FY2025 window.",
        "The state filter uses each employer's most common worksite state. % of workforce is approximate: it uses headcounts that employers report on PERM filings.",
      ]}
      source="DOL OFLC LCA disclosure data and Online Wage Library, FY2025; PERM disclosure data; DOL WHD enforcement data; Texas and California WARN notices."
      method="market-gap-method.md"
    >
      <PlotFigure build={build} minHeight={420} label="Scatter plot of employers by the chosen pay and filing measures" />
    </ExploreFigure>
  );
}
