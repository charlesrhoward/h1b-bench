"use client";

import { useId } from "react";

/** One labeled input in a chart's control row. */
export function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-neutral-secondary">{label}</span>
      {children}
    </div>
  );
}

export type Choice<T extends string> = { value: T; label: string };

/** A single-choice pill group, styled like the fiscal year chips. */
export function Segmented<T extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: T;
  choices: Choice<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <Control label={label}>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={choice.value === value}
            onClick={() => onChange(choice.value)}
            className={`rounded-full px-3 py-1 text-[13px] ${
              choice.value === value
                ? "bg-brand-primary text-neutral-tertiary hover:bg-brand-primary-hover"
                : "bg-neutral-secondary text-neutral-secondary hover:text-neutral-secondary-hover"
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </Control>
  );
}

/** A labeled range slider that shows its current value. */
export function Range({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="flex justify-between gap-3 text-xs font-medium text-neutral-secondary">
        {label}
        <output htmlFor={id} className="tabular-nums text-neutral-primary">
          {format(value)}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="explore-range w-full"
      />
    </div>
  );
}

/** A text box that filters or highlights chart marks by name. */
export function SearchBox({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-neutral-secondary">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-md border border-neutral-tertiary bg-neutral-primary px-2.5 text-[13px] text-neutral-primary placeholder:text-neutral-secondary hover:border-neutral-tertiary-hover"
      />
    </div>
  );
}

/** An on/off chip. The swatch shows how the chart marks the items it turns on. */
export function Toggle({
  label,
  checked,
  swatch,
  onChange,
}: {
  label: string;
  checked: boolean;
  swatch: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] ${
        checked
          ? "border-neutral-tertiary-hover text-neutral-primary"
          : "border-neutral-tertiary text-neutral-secondary hover:text-neutral-secondary-hover"
      }`}
    >
      <span aria-hidden className={`size-2.5 rounded-full ${checked ? swatch : "bg-chart-neutral-tertiary"}`} />
      {label}
    </button>
  );
}

/** A removable chip for an active selection, such as a chosen state. */
export function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Clear ${label}`}
      className="inline-flex items-center gap-1.5 rounded-full bg-accent-secondary px-3 py-1 text-[13px] text-neutral-primary hover:bg-accent-secondary-hover"
    >
      {label}
      <span aria-hidden className="text-neutral-secondary">
        ×
      </span>
    </button>
  );
}
