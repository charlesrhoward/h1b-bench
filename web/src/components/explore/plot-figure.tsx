"use client";

import { useEffect, useRef, useState } from "react";
import type { Palette } from "./use-palette";
import { usePalette } from "./use-palette";

/** Builds one chart for the given width and palette. Return null to render nothing. */
export type PlotBuilder = (width: number, palette: Palette) => Element | null;

/** Tracks an element's content width with a ResizeObserver. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Mounts an Observable Plot chart. It rebuilds when the width, the color scheme, or `build`
 * changes, so callers memoize `build` with the inputs it reads.
 */
export default function PlotFigure({
  build,
  minHeight,
  label,
}: {
  build: PlotBuilder;
  minHeight: number;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const palette = usePalette();

  useEffect(() => {
    const node = ref.current;
    if (!node || !palette || width === 0) return;
    const chart = build(width, palette);
    if (!chart) return;
    node.replaceChildren(chart);
    return () => chart.remove();
  }, [build, palette, width, ref]);

  return <div ref={ref} role="img" aria-label={label} className="plot-figure w-full" style={{ minHeight }} />;
}
