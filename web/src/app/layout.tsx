import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import MobileMenu from "@/components/mobile-menu";
import SiteSearch from "@/components/site-search";
import { NAV_LINKS, REPO_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://h1b-webrenew.vercel.app"),
  title: "H1B Bench — Who sponsors, what they pay, when they file",
  description:
    "Benchmark every U.S. employer's H-1B / H-1B1 / E-3 visa filings from official DOL disclosure data: certification rates, wages, job titles, and trends since FY2020.",
  openGraph: {
    siteName: "H1B Bench",
    title: "H1B Bench — Who sponsors, what they pay, when they file",
    description:
      "Benchmark every U.S. employer's H-1B / H-1B1 / E-3 visa filings from official DOL disclosure data: certification rates, wages, job titles, and trends since FY2020.",
  },
  twitter: {
    card: "summary_large_image",
    title: "H1B Bench — Who sponsors, what they pay, when they file",
    description:
      "Benchmark every U.S. employer's H-1B / H-1B1 / E-3 visa filings from official DOL disclosure data: certification rates, wages, job titles, and trends since FY2020.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <header className="relative z-40 border-b border-zinc-800">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
            <Link href="/" className="font-mono text-lg font-bold tracking-tight">
              H1B<span className="text-emerald-400">_</span>Bench
            </Link>
            <div className="order-3 w-full sm:order-2 sm:w-auto sm:min-w-0 sm:flex-1 sm:px-4">
              <div className="sm:mx-auto sm:max-w-md">
                <SiteSearch />
              </div>
            </div>
            <nav
              aria-label="Main"
              className="order-3 hidden gap-x-6 whitespace-nowrap text-sm text-zinc-400 lg:flex"
            >
              {NAV_LINKS.map((l) =>
                l.external ? (
                  <a key={l.href} href={l.href} className="hover:text-zinc-100" target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                ) : (
                  <Link key={l.href} href={l.href} className="hover:text-zinc-100">
                    {l.label}
                  </Link>
                ),
              )}
            </nav>
            <MobileMenu links={NAV_LINKS} />
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
        <footer className="space-y-3 border-t border-zinc-800 px-4 py-6 sm:px-6 text-center text-xs text-zinc-500">
          <p>
            Data: U.S. Department of Labor, Office of Foreign Labor Certification — LCA disclosure
            files FY2020–FY2026 Q3. LCA certification is a filing step, not a visa grant.
          </p>
          <nav className="flex justify-center gap-5">
            <a href={`${REPO_URL}/blob/main/CONTRIBUTING.md`} className="hover:text-zinc-300">
              Contributing
            </a>
            <a href={`${REPO_URL}/blob/main/LICENSE`} className="hover:text-zinc-300">
              MIT License
            </a>
            <a href={REPO_URL} className="hover:text-zinc-300">
              GitHub
            </a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
