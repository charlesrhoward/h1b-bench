import { PAGES, PAGE_LIST } from "@/lib/pages";
import { REPO_URL, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import { SOURCE_GROUPS } from "@/lib/sources";

export const dynamic = "force-static";

const METHOD_URL = `${REPO_URL}/blob/main/docs`;

function pagesSection() {
  const lines = PAGE_LIST.map((page) => `- [${page.name}](${absoluteUrl(page.path)}): ${page.description}`);
  lines.push(
    `- Employer pages (${SITE_URL}/employers/{id}): one page per employer, with filings by year, certification rate, median wage, top roles, and any back wages, layoff notices, or green card filings found for it. Search them from the [employer leaderboard](${absoluteUrl(PAGES.employers.path)}).`,
  );
  return lines.join("\n");
}

function sourcesSection() {
  return SOURCE_GROUPS.flatMap((group) =>
    group.sources.map((source) => `- [${source.name}](${source.dataUrl}): ${group.publisher}. ${source.coverage}. ${source.summary}`),
  ).join("\n");
}

function methodsSection() {
  const docs = new Set(SOURCE_GROUPS.flatMap((group) => group.sources.flatMap((source) => source.methods)));
  return [...docs].map((doc) => `- [${doc}](${METHOD_URL}/${doc})`).join("\n");
}

/** llms.txt (llmstxt.org): a plain-language map of the site for language models. */
function llmsText() {
  return `# ${SITE_NAME}

> ${SITE_NAME} shows what U.S. government H-1B data says. It benchmarks every employer's H-1B, H-1B1, and E-3 Labor Condition Applications (LCAs) from Department of Labor disclosure files, FY2020 to FY2026 Q3, and compares H-1B pay and use with other public federal and state data.

Read these facts before you cite a number from this site:

- An LCA certification is a filing step. It is not a visa, a hire, or a petition approval.
- Every number comes from a public U.S. government file. The "Data sources" page names each file, and each finding has a method document.
- "% of workforce" is an approximation. It uses headcounts that employers report on their own green card (PERM) filings.
- No value is estimated or filled in. A missing value stays missing.

## Pages

${pagesSection()}

## Data sources

${sourcesSection()}

## Methods

${methodsSection()}

## Optional

- [Source code](${REPO_URL}): the Next.js app and the Python pipeline that reads the government files.
- [Sitemap](${absoluteUrl("/sitemap.xml")})
`;
}

export function GET() {
  return new Response(llmsText(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
