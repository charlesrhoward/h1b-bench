"use client";

import { useCallback, useMemo, useState } from "react";
import { unpack, type ExploreEmployer, type ExploreLaborCell, type ExploreWire } from "@/lib/explore-model";
import { summarizeStates } from "@/lib/explore-stats";
import CompanySection from "./company-section";
import { MAX_COMPARED, compareColors } from "./compare-colors";
import CompareSection from "./compare-section";
import MapSection from "./map-section";
import OccupationSection from "./occupation-section";
import { usePalette } from "./use-palette";

/** The largest filers start in the comparison, so the panel is never empty on first load. */
function initialCompared(employers: ExploreEmployer[]): number[] {
  return [...employers].sort((a, b) => b.filings - a.filings).slice(0, MAX_COMPARED).map((e) => e.id);
}

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

/**
 * The linked views. One state, one occupation, and up to three employers are shared:
 * a click in one chart changes what the others show.
 */
export default function Explorer({ wire }: { wire: ExploreWire }) {
  const data = useMemo(
    () => ({ ...wire, employers: unpack<ExploreEmployer>(wire.employers), cells: unpack<ExploreLaborCell>(wire.cells) }),
    [wire],
  );
  const [state, setState] = useState("US");
  const [occ, setOcc] = useState<string | null>(null);
  const [comparedIds, setComparedIds] = useState(() => initialCompared(data.employers));
  const palette = usePalette();
  const colors = useMemo(() => compareColors(palette), [palette]);
  const byId = useMemo(() => new Map(data.employers.map((e) => [e.id, e])), [data.employers]);
  const compared = useMemo(() => comparedIds.flatMap((id) => byId.get(id) ?? []), [comparedIds, byId]);
  const summaries = useMemo(() => summarizeStates(data.cells, occ), [data.cells, occ]);

  const clearState = useCallback(() => setState("US"), []);
  const pick = useCallback((e: ExploreEmployer) => {
    setComparedIds((ids) => (ids.includes(e.id) ? ids.filter((id) => id !== e.id) : [...ids, e.id].slice(-MAX_COMPARED)));
  }, []);
  const remove = useCallback((id: number) => setComparedIds((ids) => ids.filter((x) => x !== id)), []);

  return (
    <div className="space-y-16">
      <Section id="states" index={1} title="Where H-1B jobs are, and who is out of work"
        lede="Compare H-1B demand with unemployed workers who had the same jobs, state by state. Pick a measure. Then click a state.">
        <MapSection summaries={summaries} selected={state} occTitle={occ ? data.occupations[occ] : null} onSelect={setState} />
      </Section>
      <Section id="occupations" index={2} title="Occupations: new H-1B positions against the unemployed"
        lede="Each dot is a job group. Dots above the dashed line have more unemployed workers than new H-1B positions.">
        <OccupationSection cells={data.cells} titles={data.occupations} state={state} selectedOcc={occ}
          onSelectOcc={setOcc} onClearState={clearState} />
      </Section>
      <Section id="employers" index={3} title="Employers: pay against the local market"
        lede="Every employer with 25 or more H-1B filings in FY2025. Change the axes to compare pay, scale, and reliance on H-1B workers.">
        <CompanySection employers={data.employers} state={state} compared={compared} compareColors={colors}
          onPick={pick} onClearState={clearState} />
      </Section>
      <Section id="compare" index={4} title="Compare employers side by side"
        lede="Filings over time, where each employer sits in the field, and the facts behind each number.">
        <CompareSection employers={data.employers} compared={compared} colors={colors} onAdd={pick} onRemove={remove} />
      </Section>
    </div>
  );
}
