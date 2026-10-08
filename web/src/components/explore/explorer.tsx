"use client";

import dynamic from "next/dynamic";
import DeferredSection from "./deferred-section";
import { memo, useCallback, useMemo, useState } from "react";
import type { ExploreEmployer } from "@/lib/explore-model";
import { summarizeStates, type StateSummary } from "@/lib/explore-stats";
import { MAX_COMPARED, compareColors } from "./compare-colors";
import StateMapSection from "./map-section";
import { usePalette } from "./use-palette";
import { ExploreDataStatus, useExploreData } from "./use-explore-data";

const CompanySection = memo(dynamic(() => import("./company-section")));
const CompareSection = memo(dynamic(() => import("./compare-section")));
const MapSection = memo(StateMapSection);
const OccupationSection = memo(dynamic(() => import("./occupation-section")));

function Section({ id, index, title, lede, children }: { id: string; index: number; title: string; lede: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-6 border-t border-neutral-secondary pt-10">
      <div className="max-w-3xl space-y-3">
        <p className="font-code text-xs text-neutral-secondary">{String(index).padStart(2, "0")}</p>
        <h2 id={`${id}-title`} className="type-heading text-balance">{title}</h2>
        <p className="type-body text-neutral-secondary">{lede}</p>
      </div>
      {children}
    </section>
  );
}

const EMPTY_EMPLOYERS: ExploreEmployer[] = [];

/**
 * The linked views. One state, one occupation, and up to three employers are shared:
 * a click in one chart changes what the others show.
 */
export default function Explorer({ initialSummaries, initialCompared }: { initialSummaries: StateSummary[]; initialCompared: number[] }) {
  const { data, failed, load } = useExploreData();
  const employers = data?.employers ?? EMPTY_EMPLOYERS;
  const [state, setState] = useState("US");
  const [occ, setOcc] = useState<string | null>(null);
  const [comparedIds, setComparedIds] = useState(initialCompared);
  const palette = usePalette();
  const colors = useMemo(() => compareColors(palette), [palette]);
  const byId = useMemo(() => new Map(employers.map((e) => [e.id, e])), [employers]);
  const compared = useMemo(() => comparedIds.flatMap((id) => byId.get(id) ?? []), [comparedIds, byId]);
  const summaries = useMemo(() => {
    if (data && occ) return summarizeStates(data.cells, occ);
    return new Map(initialSummaries.map((row) => [row.code, row]));
  }, [data, occ, initialSummaries]);

  const clearState = useCallback(() => setState("US"), []);
  const pick = useCallback((e: ExploreEmployer) => {
    setComparedIds((ids) => (ids.includes(e.id) ? ids.filter((id) => id !== e.id) : [...ids, e.id].slice(-MAX_COMPARED)));
  }, []);
  const remove = useCallback((id: number) => setComparedIds((ids) => ids.filter((x) => x !== id)), []);

  return (
    <div className="space-y-16">
      <Section id="states" index={1} title="Where H-1B jobs are, and who is out of work"
        lede="Compare H-1B demand with unemployed workers who had the same jobs, state by state. Pick a measure. Then click a state.">
        <MapSection summaries={summaries} selected={state} occTitle={occ && data ? data.occupations[occ] : null} onSelect={setState} />
      </Section>
      <Section id="occupations" index={2} title="Occupations: new H-1B positions against the unemployed"
        lede="Each dot is a job group. Dots above the dashed line have more unemployed workers than new H-1B positions.">
        <DeferredSection onVisible={load}>
          {data ? (
            <OccupationSection cells={data.cells} titles={data.occupations} state={state} selectedOcc={occ}
            onSelectOcc={setOcc} onClearState={clearState} />
          ) : <ExploreDataStatus failed={failed} retry={load} />}
        </DeferredSection>
      </Section>
      <Section id="employers" index={3} title="Employers: pay against the local market"
        lede="Every employer with 25 or more H-1B filings in FY2025. Change the axes to compare pay, scale, and reliance on H-1B workers.">
        <DeferredSection onVisible={load}>
          {data ? (
            <CompanySection employers={data.employers} state={state} compared={compared} compareColors={colors}
            onPick={pick} onClearState={clearState} />
          ) : <ExploreDataStatus failed={failed} retry={load} />}
        </DeferredSection>
      </Section>
      <Section id="compare" index={4} title="Compare employers side by side"
        lede="Filings over time, where each employer sits in the field, and the facts behind each number.">
        <DeferredSection onVisible={load}>
          {data ? (
            <CompareSection employers={data.employers} compared={compared} colors={colors} onAdd={pick} onRemove={remove} />
          ) : <ExploreDataStatus failed={failed} retry={load} />}
        </DeferredSection>
      </Section>
    </div>
  );
}
