import Link from "next/link";

export const FISCAL_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

/** Fiscal year chips. `hrefFor` builds each link so callers keep their own query params. */
export default function YearTabs({
  active,
  hrefFor,
  children,
}: {
  active: number;
  hrefFor: (year: number) => string;
  children?: React.ReactNode;
}) {
  return (
    <nav aria-label="Fiscal year" className="flex flex-wrap gap-2">
      {FISCAL_YEARS.map((y) => (
        <Link
          key={y}
          href={hrefFor(y)}
          aria-current={y === active ? "page" : undefined}
          className={`rounded-full px-3.5 py-1.5 text-sm tabular-nums ${
            y === active
              ? "bg-brand-primary text-neutral-tertiary hover:bg-brand-primary-hover"
              : "bg-neutral-secondary text-neutral-secondary hover:text-neutral-secondary-hover"
          }`}
        >
          FY{y}
        </Link>
      ))}
      {children}
    </nav>
  );
}
