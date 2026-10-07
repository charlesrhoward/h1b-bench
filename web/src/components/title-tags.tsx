/** Kicker over a page title; it breaks only between parts, never inside one. */
export function Eyebrow({ parts }: { parts: string[] }) {
  return (
    <p className="flex flex-wrap gap-x-2 text-[13px] font-medium text-accent-primary">
      {parts.map((part, i) => (
        <span key={part} className="whitespace-nowrap">
          {part}
          {i < parts.length - 1 ? <span aria-hidden="true" className="text-neutral-secondary"> ·</span> : null}
        </span>
      ))}
    </p>
  );
}

/** "FY2026" plus a "year to date" badge when the year is not complete; the two never split. */
export function FiscalYearTag({ fy, ytd }: { fy: number; ytd: boolean }) {
  return (
    <span className="whitespace-nowrap">
      FY{fy}
      {ytd ? " " : null}
      {ytd ? (
        <span className="ml-1 inline-block rounded-full bg-neutral-secondary px-2 py-px align-middle font-ui text-[11px] font-normal leading-4 text-neutral-secondary">
          year to date
        </span>
      ) : null}
    </span>
  );
}
