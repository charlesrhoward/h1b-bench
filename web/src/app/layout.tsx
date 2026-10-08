import type { Metadata } from "next";
import Link from "next/link";
import {
  Fraunces,
  IM_Fell_Double_Pica,
  Inter,
  Playfair_Display,
  Source_Code_Pro,
  Source_Serif_4,
} from "next/font/google";
import DesktopNav from "@/components/desktop-nav";
import GitHubLink from "@/components/github-link";
import JsonLd from "@/components/json-ld";
import { websiteJsonLd } from "@/lib/json-ld";
import MobileMenu from "@/components/mobile-menu";
import SiteSearch from "@/components/site-search";
import { PAGES } from "@/lib/pages";
import { NAV_ITEMS, NAV_LINKS, REPO_URL, SITE_URL, pageMetadata } from "@/lib/site";
import "./globals.css";

// Font roles from DESIGN.md: next/font self-hosts each family with swap and a metric fallback.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], style: ["normal", "italic"] });
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});
const sourceCode = Source_Code_Pro({ variable: "--font-source-code", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["500", "700"] });
const imFell = IM_Fell_Double_Pica({ variable: "--font-im-fell", subsets: ["latin"], weight: "400" });

const FONT_VARIABLES = [inter, sourceSerif, sourceCode, fraunces, playfair, imFell]
  .map((font) => font.variable)
  .join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...pageMetadata(PAGES.home),
};

const SITE_JSON_LD = websiteJsonLd();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${FONT_VARIABLES} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-neutral-primary text-neutral-primary">
        <JsonLd data={SITE_JSON_LD} />
        <header className="relative z-40 border-b border-neutral-primary bg-neutral-primary">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 sm:px-6">
            <Link
              href="/"
              className="font-brand text-[1.65rem] font-medium leading-none tracking-tight text-neutral-primary"
            >
              H1B Bench
            </Link>
            <div className="order-3 w-full sm:order-2 sm:w-auto sm:min-w-0 sm:flex-1 sm:px-4">
              <div className="sm:max-w-sm">
                <SiteSearch />
              </div>
            </div>
            <DesktopNav items={NAV_ITEMS} />
            <div className="order-2 ml-auto flex items-center gap-1 sm:order-3 sm:ml-0 lg:-ml-3">
              <GitHubLink />
              <MobileMenu links={NAV_LINKS} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">{children}</main>
        <footer className="border-t border-neutral-primary bg-neutral-tertiary">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-[13px] text-neutral-secondary sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div className="max-w-xl space-y-2">
              <p className="font-brand text-lg font-medium text-neutral-primary">H1B Bench</p>
              <p>
                Data: public U.S. government files from the Department of Labor, USCIS, the Census
                Bureau, and state workforce agencies. LCA certification is a filing step, not a visa grant.
              </p>
            </div>
            <nav aria-label="Project" className="flex gap-5">
              <Link href="/sources" className="hover:text-neutral-secondary-hover">
                Data sources
              </Link>
              <a href={`${REPO_URL}/blob/main/CONTRIBUTING.md`} className="hover:text-neutral-secondary-hover">
                Contributing
              </a>
              <a href={`${REPO_URL}/blob/main/LICENSE`} className="hover:text-neutral-secondary-hover">
                MIT License
              </a>
              <a href={REPO_URL} className="hover:text-neutral-secondary-hover">
                GitHub
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
