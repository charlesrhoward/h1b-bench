/** One public data file (or file family) that a number on the site comes from. */
export type DataSource = {
  name: string;
  coverage: string;
  summary: string;
  usedOn: { href: string; label: string }[];
  dataUrl: string;
  methods: string[];
};

export type SourceGroup = { publisher: string; sources: DataSource[] };

const OFLC_PERFORMANCE_URL = "https://www.dol.gov/agencies/eta/foreign-labor/performance";

const HOME = { href: "/", label: "Home" };
const EMPLOYERS = { href: "/employers", label: "Employers" };
const OCCUPATIONS = { href: "/jobs", label: "Occupations" };
const LABOR_POOL = { href: "/labor-pool", label: "Labor pool" };
const PAY_VS_MARKET = { href: "/pay-vs-market", label: "Pay vs. market" };
const EXPLORE = { href: "/explore", label: "Explore" };

/** Every source the site uses, grouped by publisher. Each entry links its methods in docs/. */
export const SOURCE_GROUPS: SourceGroup[] = [
  {
    publisher: "U.S. Department of Labor, Office of Foreign Labor Certification (OFLC)",
    sources: [
      {
        name: "LCA disclosure data",
        coverage: "FY2020 to FY2026 Q3 · H-1B, H-1B1, and E-3 · quarterly files",
        summary:
          "Every Labor Condition Application (LCA) that DOL decided. An LCA is a filing step before an H-1B petition. It is not a visa or a hire. The site gets employers, occupations, offered wages, wage levels, and case status from these files.",
        usedOn: [HOME, EMPLOYERS, OCCUPATIONS, LABOR_POOL, PAY_VS_MARKET, EXPLORE],
        dataUrl: OFLC_PERFORMANCE_URL,
        methods: ["pw-source-method.md"],
      },
      {
        name: "PERM disclosure data",
        coverage: "FY2025 and FY2026 Q3 · green card labor certifications (Form ETA-9089)",
        summary:
          "Employer green card filings. The site uses them for two things. First, each employer's self-reported headcount, which gives the approximate “% of workforce” column. Second, the FY2025 green card finding.",
        usedOn: [EMPLOYERS, PAY_VS_MARKET, EXPLORE],
        dataUrl: OFLC_PERFORMANCE_URL,
        methods: ["perm-lockin-method.md"],
      },
      {
        name: "Online Wage Library",
        coverage: "Wage years 2024-25 and 2025-26 · All Industries file and area table",
        summary:
          "DOL's prevailing wage levels for each occupation and area, computed from Bureau of Labor Statistics OEWS data. The Level III wage is the local median. The site compares each H-1B offer with that median.",
        usedOn: [PAY_VS_MARKET, EXPLORE],
        dataUrl: "https://flag.dol.gov/wage-data/wage-data-downloads",
        methods: ["market-gap-method.md"],
      },
    ],
  },
  {
    publisher: "U.S. Department of Labor, Wage and Hour Division (WHD)",
    sources: [
      {
        name: "WHD enforcement data",
        coverage: "All concluded compliance actions since FY2005",
        summary:
          "Cases that WHD closed. The site uses the H-1B violations, the H-1B back wages that employers agreed to pay, and the civil money penalties.",
        usedOn: [EMPLOYERS, PAY_VS_MARKET, EXPLORE],
        dataUrl: "https://data.dol.gov/data-catalog/WHD/enforcement/",
        methods: ["back-wages-method.md"],
      },
    ],
  },
  {
    publisher: "U.S. Citizenship and Immigration Services (USCIS)",
    sources: [
      {
        name: "H-1B electronic registration data",
        coverage: "Cap fiscal years 2021 to 2026 · Historical Data table",
        summary:
          "Lottery registration counts, including registrations for people with more than one registration. The six rows are copied by hand from the USCIS table. No value is estimated.",
        usedOn: [PAY_VS_MARKET],
        dataUrl:
          "https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations/h-1b-electronic-registration-process",
        methods: ["lottery-method.md"],
      },
    ],
  },
  {
    publisher: "U.S. Census Bureau",
    sources: [
      {
        name: "American Community Survey (ACS) PUMS",
        coverage: "2024 1-year person file · 80 replicate weights",
        summary:
          "Survey records of unemployed people and the occupation of their most recent job. The site counts them by occupation and state, with a 90% margin of error.",
        usedOn: [LABOR_POOL, EXPLORE],
        dataUrl: "https://www2.census.gov/programs-surveys/acs/data/pums/2024/1-Year/",
        methods: ["labor-pool-method.md", "labor-pool-results.md"],
      },
      {
        name: "2018 occupation code list and crosswalk",
        coverage: "SOC code to Census occupation code",
        summary: "The bridge between LCA occupation codes and ACS occupation groups.",
        usedOn: [LABOR_POOL, EXPLORE],
        dataUrl:
          "https://www2.census.gov/programs-surveys/demo/guidance/industry-occupation/2018-occupation-code-list-and-crosswalk.xlsx",
        methods: ["labor-pool-method.md"],
      },
    ],
  },
  {
    publisher: "State workforce agencies",
    sources: [
      {
        name: "Texas WARN notices",
        coverage: "Texas Workforce Commission · notices from Oct 1, 2024 to Sep 30, 2025",
        summary: "Mass-layoff notices that employers filed in Texas.",
        usedOn: [EMPLOYERS, PAY_VS_MARKET, EXPLORE],
        dataUrl: "https://data.texas.gov/dataset/WARN-Notices/8w53-c4f6",
        methods: ["warn-method.md"],
      },
      {
        name: "California WARN report",
        coverage: "California EDD · notices from Oct 1, 2024 to Jun 30, 2025",
        summary:
          "Mass-layoff notices that employers filed in California. California does not publish July to September 2025 as a data file, so the window ends in June.",
        usedOn: [EMPLOYERS, PAY_VS_MARKET, EXPLORE],
        dataUrl:
          "https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn-report-for-7-1-2024-to-06-30-2025.pdf",
        methods: ["warn-method.md"],
      },
    ],
  },
];
