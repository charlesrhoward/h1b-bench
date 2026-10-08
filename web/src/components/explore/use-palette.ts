"use client";

import { useSyncExternalStore } from "react";

/**
 * Chart colors resolved from the design tokens. Plot interpolates colors, so it needs real
 * rgb() values, not var() references. Each key names the token it comes from.
 */
export type Palette = {
  accent: string;
  accentSecondary: string;
  accentTertiary: string;
  accentQuaternary: string;
  yellow: string;
  yellowSecondary: string;
  neutral: string;
  neutralTertiary: string;
  ink: string;
  muted: string;
  rule: string;
  surface: string;
  elevated: string;
};

const TOKENS: Record<keyof Palette, string> = {
  accent: "--color-chart-accent-primary",
  accentSecondary: "--color-chart-accent-secondary",
  accentTertiary: "--color-chart-accent-tertiary",
  accentQuaternary: "--color-chart-accent-quaternary",
  yellow: "--color-chart-utility-yellow-primary",
  yellowSecondary: "--color-chart-utility-yellow-secondary",
  neutral: "--color-chart-neutral-primary",
  neutralTertiary: "--color-chart-neutral-tertiary",
  ink: "--color-fg-neutral-primary",
  muted: "--color-fg-neutral-secondary",
  rule: "--color-border-neutral-primary",
  surface: "--color-bg-neutral-primary",
  elevated: "--color-bg-neutral-elevated",
};

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Reads each token through a probe element, so light-dark() toggles resolve to the active scheme. */
function readPalette(): Palette {
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.append(probe);
  const entries = Object.entries(TOKENS).map(([key, token]) => {
    probe.style.color = `var(${token})`;
    return [key, getComputedStyle(probe).color];
  });
  probe.remove();
  return Object.fromEntries(entries) as Palette;
}

let cached: { dark: boolean; palette: Palette } | null = null;

function snapshot(): Palette | null {
  const dark = window.matchMedia(DARK_QUERY).matches;
  if (!cached || cached.dark !== dark) cached = { dark, palette: readPalette() };
  return cached.palette;
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** The resolved chart palette; null during server render. Updates when the OS color scheme changes. */
export function usePalette(): Palette | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

/** Linear mix of two rgb() colors, t in [0, 1]. */
export function mixColor(from: string, to: string, t: number): string {
  const a = from.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  const b = to.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  const channel = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/** Interpolator through several colors, for Plot's `interpolate` scale option. */
export function ramp(...stops: string[]): (t: number) => string {
  return (t) => {
    const scaled = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
    const i = Math.min(Math.floor(scaled), stops.length - 2);
    return mixColor(stops[i], stops[i + 1], scaled - i);
  };
}
