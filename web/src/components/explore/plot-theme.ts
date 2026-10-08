import type { Palette } from "./use-palette";

/** Root style for every chart: UI font, token ink, transparent background. */
export function chartStyle(palette: Palette) {
  return {
    fontFamily: "var(--font-ui)",
    fontSize: "12px",
    color: palette.ink,
    background: "transparent",
    overflow: "visible",
  };
}

/** Tooltip box in the elevated surface color, with token ink and border. */
export function tipStyle(palette: Palette) {
  return {
    fill: palette.elevated,
    stroke: palette.rule,
    textPadding: 10,
    lineHeight: 1.35,
    fontSize: 12.5,
    pathFilter: "drop-shadow(0 4px 12px rgb(0 0 0 / 0.12))",
  };
}

/** Breakpoint below which charts switch to their compact layout. */
export const NARROW_WIDTH = 560;
