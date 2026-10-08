import type { Metadata } from "next";
import surveyInstruments from "@/assets/art/survey-instruments.webp";
import HeaderArt from "@/components/header-art";
import JsonLd from "@/components/json-ld";
import Explorer from "@/components/explore/explorer";
import { Eyebrow } from "@/components/title-tags";
import { getExploreData } from "@/lib/explore";
import { EXPLORE_FY, unpack, type ExploreEmployer, type ExploreLaborCell } from "@/lib/explore-model";
import { summarizeStates } from "@/lib/explore-stats";
import { MAX_COMPARED } from "@/components/explore/compare-colors";
import { fmtInt } from "@/lib/format";
import { analysisJsonLd } from "@/lib/json-ld";
import { PAGES } from "@/lib/pages";
import { pageMetadata } from "@/lib/site";
import { bodyFont } from "@/lib/body-font";
import { dropcapFont } from "@/lib/dropcap-font";

// Public government data is refreshed hourly after an ETL load.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata(PAGES.explore);

const JSON_LD = analysisJsonLd(PAGES.explore, ["labor-pool-method.md", "market-gap-method.md", "layoff-filings-method.md"]);

export default async function ExplorePage() {
  const data = await getExploreData();
  const initialSummaries = [...summarizeStates(unpack<ExploreLaborCell>(data.cells), null).values()];
  const initialCompared = unpack<ExploreEmployer>(data.employers)
    .sort((a, b) => b.filings - a.filings).slice(0, MAX_COMPARED).map((row) => row.id);
  return (
    <div className={`${bodyFont.variable} ${dropcapFont.variable} space-y-14`}>
      <JsonLd data={JSON_LD} />
      <header className="relative max-w-3xl space-y-6 lg:max-w-none">
        <HeaderArt src={surveyInstruments} className="top-1/2 right-0 w-72 -translate-y-1/2 opacity-50 lg:w-[26rem] lg:opacity-100" />
        <Eyebrow parts={["Interactive", `FY${EXPLORE_FY}`, "Labor, Census, and state data"]} />
        <h1 className="type-title text-balance">Explore the data</h1>
        <p className="type-body dropcap max-w-2xl text-neutral-primary">
          Compare H-1B filings, offered pay, and unemployed workers by state, occupation, and
          employer. The four charts are linked. Click a state, and the charts below it follow. Click an
          employer, and it joins the comparison at the end.
        </p>
        <p className="type-meta max-w-2xl">
          {fmtInt(data.employers.rows.length)} employers, {fmtInt(Object.keys(data.occupations).length)} occupation
          groups, and every state. Each chart names its source files and method.
        </p>
      </header>
      <Explorer initialSummaries={initialSummaries} initialCompared={initialCompared} />
    </div>
  );
}
