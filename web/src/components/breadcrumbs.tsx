import Link from "next/link";

export type Crumb = { name: string; href: string };

/**
 * Trail above a sub-page title: Home / parent / current page. Matches breadcrumbJsonLd in
 * src/lib/json-ld.ts. The last crumb is the current page, so it is text, not a link.
 */
export default function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const crumbs = [{ name: "Home", href: "/" }, ...trail];
  return (
    <nav aria-label="Breadcrumb" className="font-ui text-[13px]">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {crumbs.map((crumb, i) => (
          <BreadcrumbItem key={crumb.href} crumb={crumb} current={i === crumbs.length - 1} first={i === 0} />
        ))}
      </ol>
    </nav>
  );
}

function BreadcrumbItem({ crumb, current, first }: { crumb: Crumb; current: boolean; first: boolean }) {
  return (
    <li className="flex min-w-0 items-center gap-x-2">
      {first ? null : (
        <span aria-hidden="true" className="text-neutral-secondary opacity-50">
          /
        </span>
      )}
      {current ? (
        <span aria-current="page" className="max-w-[40ch] truncate font-medium text-neutral-primary">
          {crumb.name}
        </span>
      ) : (
        <Link href={crumb.href} className="text-neutral-secondary hover:text-neutral-primary-hover">
          {crumb.name}
        </Link>
      )}
    </li>
  );
}
