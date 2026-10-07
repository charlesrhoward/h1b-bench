/** Mono eyebrow over a page title; it breaks only between parts, never inside one. */
export function Eyebrow({ parts }: { parts: string[] }) {
  return (
    <p className="flex flex-wrap gap-x-2 font-mono text-sm text-emerald-400">
      {parts.map((part, i) => (
        <span key={i} className="whitespace-nowrap">
          {part}
          {i < parts.length - 1 ? <span aria-hidden="true"> ·</span> : null}
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
        <span className="ml-1 inline-block rounded border border-zinc-700 px-1.5 py-px align-middle font-mono text-[11px] font-normal leading-4 text-zinc-400">
          year to date
        </span>
      ) : null}
    </span>
  );
}
