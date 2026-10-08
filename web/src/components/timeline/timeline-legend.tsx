import type { Palette } from "@/components/explore/use-palette";
import type { TimelineModel, TimelineSeries } from "./timeline-model";

/** Tailwind classes for the chart tokens a timeline can use. Class names must be literal for Tailwind to find them. */
const SWATCH: Partial<Record<keyof Palette, { fill: string; border: string }>> = {
  accent: { fill: "bg-chart-accent-primary", border: "border-chart-accent-primary" },
  accentTertiary: { fill: "bg-chart-accent-tertiary", border: "border-chart-accent-tertiary" },
  neutralTertiary: { fill: "bg-chart-neutral-tertiary", border: "border-chart-neutral-tertiary" },
  yellow: { fill: "bg-chart-yellow-primary", border: "border-chart-yellow-primary" },
  blue: { fill: "bg-chart-blue-primary", border: "border-chart-blue-primary" },
};

function Item({ swatch, children }: { swatch: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`inline-block shrink-0 ${swatch}`} aria-hidden="true" />
      {children}
    </li>
  );
}

/** Keys for the bars, the event dots, and the shaded spans, in the chart's colors. */
export default function TimelineLegend({ model, series }: { model: TimelineModel; series: TimelineSeries[] }) {
  const event = SWATCH[model.eventColor];
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-neutral-secondary">
      {series.map((s) => (
        <Item key={s.key} swatch={`size-2.5 rounded-xs ${SWATCH[s.color]?.fill ?? ""}`}>
          {s.label}
        </Item>
      ))}
      <Item swatch={`size-2.5 rounded-full ${event?.fill ?? ""}`}>{model.legend.event}</Item>
      <Item swatch={`size-2.5 rounded-full border-[1.5px] ${event?.border ?? ""}`}>{model.legend.hollowEvent}</Item>
      <Item swatch={`h-2.5 w-4 opacity-25 ${event?.fill ?? ""}`}>{model.legend.span}</Item>
    </ul>
  );
}
