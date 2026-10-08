"use client";

import { useCallback } from "react";
import PlotFigure from "@/components/explore/plot-figure";
import type { Palette } from "@/components/explore/use-palette";
import { buildTimeline } from "./timeline-chart";
import { TIMELINE_HEIGHT, type TimelineModel } from "./timeline-model";

/** The Plot part of the timeline. TimelineFigure loads it on the client only, so pages without a chart do not ship Plot. */
export default function TimelinePlot({ model, view, label }: { model: TimelineModel; view: string; label: string }) {
  const build = useCallback((width: number, palette: Palette) => buildTimeline(model, view, width, palette), [model, view]);
  return <PlotFigure build={build} minHeight={TIMELINE_HEIGHT.narrow} label={label} />;
}
