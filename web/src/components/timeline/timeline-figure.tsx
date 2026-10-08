"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Segmented } from "@/components/explore/controls";
import ExploreFigure from "@/components/explore/explore-figure";
import TimelineLegend from "./timeline-legend";
import { TIMELINE_HEIGHT, viewSeries, type TimelineModel } from "./timeline-model";

const TimelinePlot = dynamic(() => import("./timeline-plot"), {
  ssr: false,
  loading: () => <div style={{ minHeight: TIMELINE_HEIGHT.narrow }} />,
});

export type TimelineFigureProps = {
  model: TimelineModel;
  /** Accessible name of the chart. */
  label: string;
  /** Name of the view picker. */
  viewLabel: string;
  /** One or two sentences that tell the reader how to read the chart. */
  readout: string;
  notes: string[];
  source: string;
  /** Method file in docs/. */
  method: string;
};

/**
 * A timeline with a view picker, a legend, the chart, and its notes and source. The model holds
 * all the text, so any page can feed it its own rows.
 */
export default function TimelineFigure({ model, label, viewLabel, readout, notes, source, method }: TimelineFigureProps) {
  const [view, setView] = useState(model.views[0]?.value ?? "");
  const controls =
    model.views.length > 1 ? <Segmented label={viewLabel} value={view} choices={model.views} onChange={setView} /> : null;
  return (
    <ExploreFigure controls={controls} readout={<p className="type-small max-w-3xl">{readout}</p>} notes={notes} source={source} method={method}>
      <div className="space-y-3">
        <TimelineLegend model={model} series={viewSeries(model, view)} />
        <TimelinePlot model={model} view={view} label={label} />
      </div>
    </ExploreFigure>
  );
}
