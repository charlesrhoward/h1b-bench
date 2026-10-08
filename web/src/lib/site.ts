import type { Metadata } from "next";

export const REPO_URL = "https://github.com/charlesrhoward/h1b-bench";

/** Production origin. Canonical URLs, the sitemap, llms.txt, and JSON-LD use it. */
export const SITE_URL = "https://h1b-bench.com";

/** Full URL for a site path, such as "/employers". */
export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export type NavLink = { href: string; label: string; external?: boolean; description?: string };
/** Links that share one header dropdown. */
export type NavGroup = { label: string; links: NavLink[] };
export type NavItem = NavLink | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "links" in item;
}

/** Desktop header navigation: Explore first, then grouped dropdowns so the search box keeps its width. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/explore", label: "Explore" },
  {
    label: "Benchmarks",
    links: [
      { href: "/employers", label: "Employers", description: "Every sponsor's H-1B filings, pay, and certification rate by year." },
      { href: "/jobs", label: "Occupations", description: "H-1B filings and median pay for each job code." },
    ],
  },
  {
    label: "Findings",
    links: [
      { href: "/pay-vs-market", label: "Pay vs. market", description: "H-1B offers against local pay, enforcement, and layoffs." },
      { href: "/labor-pool", label: "Labor pool", description: "New H-1B positions against unemployed U.S. workers." },
    ],
  },
  { href: "/sources", label: "Sources" },
];

/** The same links as one flat list, for the mobile menu. */
export const NAV_LINKS: NavLink[] = NAV_ITEMS.flatMap((item) => (isNavGroup(item) ? item.links : [item]));

export const SITE_NAME = "H1B Bench";

/** Share card from app/opengraph-image.png. Keep the alt text in step with opengraph-image.alt.txt. */
export type ShareImage = { url: string; width: number; height: number; alt: string };

const SHARE_IMAGE: ShareImage = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "H1B Bench. Who sponsors H-1B workers, and what do they pay? Every Labor Condition Application, by employer, job, wage, and year. Beside the headline is an ink engraving of the U.S. Capitol dome.",
};

/**
 * Title, description, canonical URL, and matching Open Graph / X card text for one page.
 * Next.js replaces (not merges) a parent's `openGraph`, so every page that sets its own
 * title must set the share text and image too. A page-level `openGraph` also drops the
 * file-based `app/opengraph-image.png`, so the image is attached here explicitly.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = SHARE_IMAGE,
}: {
  title: string;
  description: string;
  path: string;
  /** A page's own share card, such as an employer's generated opengraph-image. */
  image?: ShareImage;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, url: path, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
