import type { Palette } from "./use-palette";

/** At most this many employers are compared at once. */
export const MAX_COMPARED = 3;

/** Swatch classes in the same order as compareColors: accent, blue, ink. Not yellow: yellow marks back wages. */
export const COMPARE_SWATCHES = ["bg-chart-accent-primary", "bg-chart-blue-primary", "bg-current"];

/** Chart colors for the compared employers, in order. */
export function compareColors(palette: Palette | null): string[] {
  return palette ? [palette.accent, palette.blue, palette.ink] : [];
}
