"use client";

import { useEffect, useRef, useState } from "react";
import type { Palette } from "./use-palette";
import { usePalette } from "./use-palette";

/** Builds one chart for the given width and palette. Return null to render nothing. */
export type PlotBuilder = (width: number, palette: Palette) => Element | null | Promise<Element | null>;

/** Tracks an element's content width with a ResizeObserver. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  const [nearby, setNearby] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(node);
    const viewport = new IntersectionObserver(([entry]) => setNearby(entry.isIntersecting), { rootMargin: "100px" });
    viewport.observe(node);
    return () => { observer.disconnect(); viewport.disconnect(); };
  }, []);
  return [ref, width, nearby] as const;
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
  const [ref, width, nearby] = useWidth<HTMLDivElement>();
  const palette = usePalette();

  useEffect(() => {
    const node = ref.current;
    if (!node || !palette || width === 0 || !nearby) return;
    let disposed = false;
    Promise.resolve().then(() => disposed ? null : build(width, palette)).then((chart) => {
      if (disposed || node.firstChild === chart) return;
      node.replaceChildren(...(chart ? [chart] : []));
    }).catch((error: unknown) => console.error("Chart:", error));
    // Keep the last plot's size while it is offscreen; rebuild with current inputs on return.
    return () => { disposed = true; };
  }, [build, palette, width, nearby, ref]);

  return (
    <div className="flow-root">
      <div className="-m-4 p-4" style={{ contentVisibility: "auto", containIntrinsicSize: `auto ${minHeight}px` }}>
        <div ref={ref} role="img" aria-label={label} className="plot-figure w-full" style={{ minHeight }} />
      </div>
    </div>
  );
}
