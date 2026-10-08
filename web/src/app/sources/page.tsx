import type { Metadata } from "next";
import Link from "next/link";
import publicRecords from "@/assets/art/public-records.webp";
import { ArrowUpRight } from "@/components/arrow-up-right";
import HeaderArt from "@/components/header-art";
import { Eyebrow } from "@/components/title-tags";
import { PAGES } from "@/lib/pages";
import { sourcesJsonLd } from "@/lib/json-ld";
import JsonLd from "@/components/json-ld";
import { REPO_URL, pageMetadata } from "@/lib/site";
import { SOURCE_GROUPS, type DataSource } from "@/lib/sources";
import { bodyFont } from "@/lib/body-font";
import { dropcapFont } from "@/lib/dropcap-font";

export const metadata: Metadata = pageMetadata(PAGES.sources);

const JSON_LD = sourcesJsonLd();

export default function SourcesPage() {
  return (
    <div className={`${bodyFont.variable} ${dropcapFont.variable} space-y-16`}>
      <JsonLd data={JSON_LD} />
      <header className="relative max-w-3xl space-y-6 lg:max-w-none">
        <HeaderArt src={publicRecords} className="top-1/2 right-0 w-64 -translate-y-1/2 opacity-50 lg:w-[22rem] lg:opacity-100" />
        <Eyebrow parts={["Public records", "U.S. government files"]} />
        <h1 className="type-title text-balance">Data sources</h1>
        <p className="type-body dropcap max-w-2xl text-neutral-primary">
          Every number on this site comes from a public U.S. government file. This page names each
          file, what the site uses it for, and the method that explains each number. You can
          download the same files and check our work.
        </p>
        <p className="type-small max-w-2xl text-neutral-secondary">
          The code that reads these files is open source.{" "}
          <a href={REPO_URL} className="link">
            See the code on GitHub
          </a>
          .
        </p>
      </header>

      {SOURCE_GROUPS.map((group) => (
        <section key={group.publisher} className="space-y-2">
          <h2 className="type-heading text-balance">{group.publisher}</h2>
          <div>
            {group.sources.map((source) => (
              <SourceEntry key={source.name} source={source} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SourceEntry({ source }: { source: DataSource }) {
  return (
    <article className="grid gap-x-10 gap-y-3 border-b border-neutral-primary py-7 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-neutral-primary">{source.name}</h3>
        <p className="type-meta">{source.coverage}</p>
      </div>
      <div className="space-y-4">
        <p className="type-body text-neutral-primary">{source.summary}</p>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          <dt className="text-neutral-secondary">Used on</dt>
          <dd className="flex flex-wrap gap-x-3 gap-y-1">
            {source.usedOn.map((page) => (
              <Link key={page.href} href={page.href} className="link">
                {page.label}
              </Link>
            ))}
          </dd>
          <dt className="text-neutral-secondary">Method</dt>
          <dd className="flex flex-wrap gap-x-3 gap-y-1">
            {source.methods.map((doc) => (
              <a key={doc} href={`${REPO_URL}/blob/main/docs/${doc}`} className="link font-code text-[13px]">
                {doc}
              </a>
            ))}
          </dd>
          <dt className="text-neutral-secondary">Data</dt>
          <dd>
            <a href={source.dataUrl} target="_blank" rel="noreferrer" className="link [overflow-wrap:anywhere]">
              {new URL(source.dataUrl).hostname}
              <ArrowUpRight className="ml-1 inline-block size-[0.9em] align-[-0.08em]" />
            </a>
          </dd>
        </dl>
      </div>
    </article>
  );
}
