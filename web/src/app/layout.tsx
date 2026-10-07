import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import SiteSearch from "@/components/site-search";
import { REPO_URL } from "@/lib/site";
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
        <header className="border-b border-zinc-800">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
            <Link href="/" className="font-mono text-lg font-bold tracking-tight">
              H1B<span className="text-emerald-400">_</span>Bench
            </Link>
            <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1 sm:px-4">
              <div className="sm:mx-auto sm:max-w-md">
                <SiteSearch />
              </div>
            </div>
            <nav className="order-2 -mx-6 flex w-[calc(100%+3rem)] gap-x-5 overflow-x-auto whitespace-nowrap px-6 text-sm text-zinc-400 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:order-3 sm:[mask-image:none] sm:mx-0 sm:w-auto sm:gap-x-6 sm:overflow-visible sm:px-0">
              <Link href="/employers" className="hover:text-zinc-100">Employers</Link>
              <Link href="/jobs" className="hover:text-zinc-100">Occupations</Link>
              <Link href="/labor-pool" className="hover:text-zinc-100">Labor pool</Link>
              <Link href="/cheap-labor" className="hover:text-zinc-100">Cheap labor?</Link>
              <a
                href="https://www.dol.gov/agencies/eta/foreign-labor/performance"
                className="hover:text-zinc-100"
                target="_blank"
                rel="noreferrer"
              >
                Source<span className="hidden sm:inline">: DOL OFLC</span>
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
        <footer className="space-y-3 border-t border-zinc-800 px-6 py-6 text-center text-xs text-zinc-500">
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
