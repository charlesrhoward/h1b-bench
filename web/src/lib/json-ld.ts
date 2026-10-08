import type { PageInfo } from "@/lib/pages";
import { PAGES } from "@/lib/pages";
import { REPO_URL, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import { SOURCE_GROUPS } from "@/lib/sources";

/** A schema.org node. Values are plain JSON, so JsonLd can serialize them. */
export type JsonLdNode = { [key: string]: unknown };

const SITE_ID = `${SITE_URL}/#website`;
const PUBLISHER_ID = `${SITE_URL}/#publisher`;
const SHARE_IMAGE_URL = absoluteUrl("/opengraph-image.png");
// FY2020 Q1 starts on Oct 1, 2019; FY2026 Q3 ends on Jun 30, 2026.
const LCA_COVERAGE = "2019-10-01/2026-06-30";

/** The project as a publisher: the code is open source and the data are public records. */
const publisher: JsonLdNode = {
  "@type": "Organization",
  "@id": PUBLISHER_ID,
  name: SITE_NAME,
  url: SITE_URL,
  sameAs: [REPO_URL],
};

/** Site-wide node: the site, its publisher, and the employer search. */
export function websiteJsonLd(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": SITE_ID,
        name: SITE_NAME,
        url: SITE_URL,
        description: PAGES.home.description,
        inLanguage: "en-US",
        publisher: { "@id": PUBLISHER_ID },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/employers?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      publisher,
    ],
  };
}

/** Home > page (> child) trail. Each item is a page name and its path. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: PAGES.home.name, path: "/" }, ...trail].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Government files that a page's numbers come from, as schema.org Dataset references. */
function sourcesUsedOn(path: string): JsonLdNode[] {
  return SOURCE_GROUPS.flatMap((group) =>
    group.sources
      .filter((source) => source.usedOn.some((page) => page.href === path))
      .map((source) => ({
        "@type": "Dataset",
        name: source.name,
        url: source.dataUrl,
        publisher: { "@type": "GovernmentOrganization", name: group.publisher },
      })),
  );
}

/** Wraps a page's nodes with its breadcrumb in one graph. */
export function pageGraph(page: PageInfo, ...nodes: JsonLdNode[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@graph": [...nodes, breadcrumbJsonLd([{ name: page.name, path: page.path }])],
  };
}

/** The home page's dataset: LCA filings benchmarked by employer, occupation, wage, and year. */
export function lcaDatasetJsonLd(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "H-1B, H-1B1, and E-3 Labor Condition Applications by employer, FY2020 to FY2026 Q3",
    description: PAGES.home.description,
    url: SITE_URL,
    isAccessibleForFree: true,
    creator: { "@id": PUBLISHER_ID },
    isBasedOn: sourcesUsedOn("/"),
    temporalCoverage: LCA_COVERAGE,
    spatialCoverage: { "@type": "Place", name: "United States" },
    keywords: ["H-1B", "Labor Condition Application", "LCA", "prevailing wage", "DOL OFLC"],
    variableMeasured: ["LCA filings", "Certification rate", "Median offered wage", "Worker positions"],
  };
}

/** A page of data views (leaderboards, tables) that draw on the listed government files. */
export function collectionPageJsonLd(page: PageInfo): JsonLdNode {
  return pageGraph(page, {
    "@type": "CollectionPage",
    name: page.title,
    description: page.description,
    url: absoluteUrl(page.path),
    isPartOf: { "@id": SITE_ID },
    isBasedOn: sourcesUsedOn(page.path),
  });
}

/** An analysis page: an article whose numbers come from the listed files and methods. */
export function analysisJsonLd(page: PageInfo, methods: string[]): JsonLdNode {
  return pageGraph(page, {
    "@type": "Article",
    headline: page.name,
    description: page.description,
    url: absoluteUrl(page.path),
    image: SHARE_IMAGE_URL,
    inLanguage: "en-US",
    isPartOf: { "@id": SITE_ID },
    author: { "@id": PUBLISHER_ID },
    publisher: { "@id": PUBLISHER_ID },
    isBasedOn: sourcesUsedOn(page.path),
    citation: methods.map((doc) => `${REPO_URL}/blob/main/docs/${doc}`),
  });
}

/** The sources page: a list of every government dataset the site uses. */
export function sourcesJsonLd(): JsonLdNode {
  const datasets = SOURCE_GROUPS.flatMap((group) =>
    group.sources.map((source) => ({
      "@type": "Dataset",
      name: source.name,
      description: `${source.summary} Coverage: ${source.coverage}.`,
      url: source.dataUrl,
      isAccessibleForFree: true,
      publisher: { "@type": "GovernmentOrganization", name: group.publisher },
    })),
  );
  return pageGraph(PAGES.sources, {
    "@type": "ItemList",
    name: PAGES.sources.title,
    description: PAGES.sources.description,
    url: absoluteUrl(PAGES.sources.path),
    itemListElement: datasets.map((item, i) => ({ "@type": "ListItem", position: i + 1, item })),
  });
}

/** One employer's page: a profile page about that organization, under the leaderboard. */
export function employerJsonLd(employer: {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
}, path: string): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        name: `${employer.name} — H-1B filings and pay`,
        url: absoluteUrl(path),
        isPartOf: { "@id": SITE_ID },
        isBasedOn: sourcesUsedOn(PAGES.employers.path),
        mainEntity: {
          "@type": "Organization",
          name: employer.name,
          address: {
            "@type": "PostalAddress",
            addressLocality: employer.city ?? undefined,
            addressRegion: employer.state ?? undefined,
            addressCountry: employer.country ?? undefined,
          },
        },
      },
      breadcrumbJsonLd([
        { name: PAGES.employers.name, path: PAGES.employers.path },
        { name: employer.name, path },
      ]),
    ],
  };
}
