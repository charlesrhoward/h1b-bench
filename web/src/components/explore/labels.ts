import * as Plot from "@observablehq/plot";

/** Label sizes at the chart font (12px Inter): average glyph width and line height, in pixels. */
const CHAR_WIDTH = 6.4;
const LINE_HEIGHT = 15;
const MAX_CHARS = 30;

export type LabelCandidate<T> = {
  datum: T;
  text: string;
  /** Pixel position of the mark the label names. */
  px: number;
  py: number;
  /** Clearance from the mark's center to its edge, in pixels. */
  radius: number;
  /** Forced labels (the reader's own picks) are placed even when they collide. */
  force?: boolean;
};

type Box = { x0: number; x1: number; y0: number; y1: number };
type Side = "above" | "below" | "right" | "left";
export type PlacedLabel<T> = { datum: T; text: string; side: Side };

const SIDES: Side[] = ["above", "right", "below", "left"];

/** Long names end in an ellipsis so one label cannot cover half the chart. */
export function shorten(text: string): string {
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS - 1).trimEnd()}…` : text;
}

function boxFor(c: LabelCandidate<unknown>, side: Side): Box {
  const w = c.text.length * CHAR_WIDTH;
  const gap = c.radius + 3;
  if (side === "above") return { x0: c.px - w / 2, x1: c.px + w / 2, y0: c.py - gap - LINE_HEIGHT, y1: c.py - gap };
  if (side === "below") return { x0: c.px - w / 2, x1: c.px + w / 2, y0: c.py + gap, y1: c.py + gap + LINE_HEIGHT };
  if (side === "right") return { x0: c.px + gap, x1: c.px + gap + w, y0: c.py - LINE_HEIGHT / 2, y1: c.py + LINE_HEIGHT / 2 };
  return { x0: c.px - gap - w, x1: c.px - gap, y0: c.py - LINE_HEIGHT / 2, y1: c.py + LINE_HEIGHT / 2 };
}

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const inside = (b: Box, frame: Box) => b.x0 >= frame.x0 && b.x1 <= frame.x1 && b.y0 >= frame.y0 && b.y1 <= frame.y1;

/**
 * Greedy placement: candidates in priority order try each side of their mark and take the
 * first spot that stays in the frame and clears every label already placed.
 */
export function placeLabels<T>(candidates: LabelCandidate<T>[], frame: Box): PlacedLabel<T>[] {
  const taken: Box[] = [];
  const placed: PlacedLabel<T>[] = [];
  for (const c of candidates) {
    const side = SIDES.find((s) => {
      const box = boxFor(c, s);
      return inside(box, frame) && !taken.some((t) => overlaps(box, t));
    });
    const chosen = side ?? (c.force ? "above" : null);
    if (!chosen) continue;
    taken.push(boxFor(c, chosen));
    placed.push({ datum: c.datum, text: c.text, side: chosen });
  }
  return placed;
}

const SIDE_OPTIONS: Record<Side, { textAnchor: "middle" | "start" | "end"; dx: (r: number) => number; dy: (r: number) => number }> = {
  above: { textAnchor: "middle", dx: () => 0, dy: (r) => -(r + 3 + LINE_HEIGHT / 2) },
  below: { textAnchor: "middle", dx: () => 0, dy: (r) => r + 3 + LINE_HEIGHT / 2 },
  right: { textAnchor: "start", dx: (r) => r + 3, dy: () => 0 },
  left: { textAnchor: "end", dx: (r) => -(r + 3), dy: () => 0 },
};

/**
 * Plot text marks for placed labels. Plot's dx and dy are constants, so labels are grouped
 * by side and rounded radius.
 */
export function labelMarks<T>(
  placed: PlacedLabel<T>[],
  channels: { x: (d: T) => number; y: (d: T) => number; radius: (d: T) => number },
  style: { fill: string; halo: string },
) {
  const groups = new Map<string, PlacedLabel<T>[]>();
  for (const label of placed) {
    const key = `${label.side}:${Math.round(channels.radius(label.datum))}`;
    groups.set(key, [...(groups.get(key) ?? []), label]);
  }
  return [...groups.entries()].map(([key, labels]) => {
    const [side, radius] = key.split(":") as [Side, string];
    const option = SIDE_OPTIONS[side];
    return Plot.text(labels, {
      x: (l: PlacedLabel<T>) => channels.x(l.datum),
      y: (l: PlacedLabel<T>) => channels.y(l.datum),
      text: "text",
      textAnchor: option.textAnchor,
      dx: option.dx(Number(radius)),
      dy: option.dy(Number(radius)),
      fill: style.fill,
      stroke: style.halo,
      strokeWidth: 3,
      paintOrder: "stroke",
    });
  });
}
