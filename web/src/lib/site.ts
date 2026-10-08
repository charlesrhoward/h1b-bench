import type { Metadata } from "next";

export const REPO_URL = "https://github.com/charlesrhoward/h1b-bench";

/** Production origin. Canonical URLs, the sitemap, llms.txt, and JSON-LD use it. */
export const SITE_URL = "https://h1b-bench.com";

/** Full URL for a site path, such as "/employers". */
export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export type NavLink = { href: string; label: string; external?: boolean };

/** Site navigation, shared by the desktop nav and the mobile menu. */
export const NAV_LINKS: NavLink[] = [
  { href: "/employers", label: "Employers" },
  { href: "/jobs", label: "Occupations" },
  { href: "/labor-pool", label: "Labor pool" },
  { href: "/pay-vs-market", label: "Pay vs. market" },
  { href: "/sources", label: "Sources" },
];

export const SITE_NAME = "H1B Bench";

/** Share card from app/opengraph-image.png. Keep the alt text in step with opengraph-image.alt.txt. */
const SHARE_IMAGE = {
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
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, url: path, title, description, images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE] },
  };
}
