import type { Palette } from "./use-palette";

/** At most this many employers are compared at once. */
export const MAX_COMPARED = 3;

/** Swatch classes in the same order as compareColors: accent, yellow, ink. */
export const COMPARE_SWATCHES = ["bg-chart-accent-primary", "bg-chart-yellow-primary", "bg-current"];

/** Chart colors for the compared employers, in order. */
export function compareColors(palette: Palette | null): string[] {
  return palette ? [palette.accent, palette.yellow, palette.ink] : [];
}
