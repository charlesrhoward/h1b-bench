import type { MetadataRoute } from "next";

/** One indexable page: its URL path, share text, and sitemap hints. */
export type PageInfo = {
  path: string;
  name: string;
  title: string;
  description: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

/**
 * Title and description for each top-level page. Page metadata, sitemap.xml, llms.txt, and
 * JSON-LD all read from here, so the text stays the same everywhere.
 */
export const PAGES = {
  home: {
    path: "/",
    name: "Home",
    title: "H1B Bench — Who sponsors, what they pay, when they file",
    description:
      "Benchmark every U.S. employer's H-1B / H-1B1 / E-3 visa filings from official DOL disclosure data: certification rates, wages, job titles, and trends since FY2020.",
    changeFrequency: "monthly",
    priority: 1,
  },
  employers: {
    path: "/employers",
    name: "Employer leaderboard",
    title: "Employer leaderboard — H1B Bench",
    description:
      "Every U.S. employer's H-1B Labor Condition Applications by fiscal year: filings, certification rate, workers, share of workforce, median wage, and top role. Source: DOL OFLC.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  jobs: {
    path: "/jobs",
    name: "Occupation benchmarks",
    title: "Occupation benchmarks — H1B Bench",
    description:
      "H-1B Labor Condition Applications by SOC occupation and fiscal year: filings, certification rate, median wage, and employer count. Source: DOL OFLC.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  laborPool: {
    path: "/labor-pool",
    name: "Could Americans fill these jobs?",
    title: "Could Americans fill these jobs? — H1B Bench",
    description:
      "H-1B filings against unemployed U.S. workers with matching job history, from DOL and Census data. It counts the unemployed only, not the underemployed.",
    changeFrequency: "yearly",
    priority: 0.8,
  },
  payVsMarket: {
    path: "/pay-vs-market",
    name: "H-1B pay vs. the local market",
    title: "H-1B pay vs. the local market — H1B Bench",
    description:
      "Federal data on H-1B pay and use: wage levels, pay below the local median, back wages, layoffs, lottery registrations, and green card filings.",
    changeFrequency: "yearly",
    priority: 0.8,
  },
  sources: {
    path: "/sources",
    name: "Data sources",
    title: "Data sources — H1B Bench",
    description:
      "Every public U.S. government file behind H1B Bench: DOL LCA, PERM, and wage data, WHD enforcement, USCIS lottery data, Census ACS, and state WARN notices, with the method for each number.",
    changeFrequency: "yearly",
    priority: 0.6,
  },
} satisfies Record<string, PageInfo>;

export const PAGE_LIST: PageInfo[] = Object.values(PAGES);
