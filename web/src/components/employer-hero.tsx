import { EmployerFlagCards, EmployerFlagPills } from "@/components/employer-flags";
import { ParentChip } from "@/components/employer-parent";
import Breadcrumbs from "@/components/breadcrumbs";
import HeaderFigure from "@/components/header-figure";
import ironworkersLunch from "@/assets/art/ironworkers-lunch.webp";
import ironworkersLunchDark from "@/assets/art/ironworkers-lunch-dark.webp";
import type { EmployerFlags } from "@/lib/employer-flags";
import type { loadEmployer } from "@/lib/employer-page";

type Found = NonNullable<Awaited<ReturnType<typeof loadEmployer>>>;

/** The ironworkers' lunch, large and faded so it can sit a little behind the title. The scene is wide (4:3). */
const ART = {
  sizes: "(min-width: 1024px) 36rem, 18rem",
  figure: "right-0 bottom-0 w-72 opacity-60 lg:w-144",
  header: "sm:min-h-54 sm:pr-64 lg:min-h-108 lg:pr-120",
};

function Identity({ found, flags }: { found: Found; flags: EmployerFlags }) {
  const { employer, parent, segment } = found;
  return (
    <div>
      <Breadcrumbs
        trail={[
          { name: "Employers", href: "/employers" },
          { name: employer.name, href: `/employers/${segment}` },
        ]}
      />
      <h1 className="type-title mt-4 text-balance [overflow-wrap:anywhere]">{employer.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <EmployerFlagPills flags={flags} />
        <ParentChip parent={parent} />
      </div>
      <p className="mt-2 text-neutral-secondary">
        {[employer.city, employer.state, employer.country].filter(Boolean).join(", ")}
      </p>
      <a
        href={`https://www.google.com/search?q=${encodeURIComponent(`${employer.name} official website`)}&btnI=1`}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-neutral-secondary px-3.5 py-1.5 text-[13px] font-medium text-neutral-primary hover:border-brand-primary"
        title={`Open ${employer.name}'s website (via Google)`}
      >
        Website
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17 17 7" />
          <path d="M8 7h9v9" />
        </svg>
      </a>
    </div>
  );
}

/**
 * The top of an employer page. With the Layoffs flag, the flag cards take the right column, so
 * the layoff timeline below starts higher on the page. Otherwise the ironworkers' lunch fills the
 * right side, and any flag card goes under the header.
 */
export default function EmployerHero({ found, flags }: { found: Found; flags: EmployerFlags }) {
  if (flags.layoffs) {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:items-start">
        <Identity found={found} flags={flags} />
        <EmployerFlagCards flags={flags} className="grid gap-4 md:grid-cols-2 lg:grid-cols-1" />
      </div>
    );
  }
  return (
    <>
      <div className={`relative ${ART.header}`}>
        <HeaderFigure light={ironworkersLunch} dark={ironworkersLunchDark} sizes={ART.sizes} className={ART.figure} />
        <Identity found={found} flags={flags} />
      </div>
      <EmployerFlagCards flags={flags} />
    </>
  );
}
