<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Web app

Read the root `AGENTS.md` first. It holds the purpose, data-accuracy, lint, and copy rules.

## Layout

- `src/app/` holds routes. Pages render on the server (`export const dynamic = "force-dynamic"`).
- `src/lib/queries.ts`, `src/lib/cheap-labor.ts`, and `src/lib/labor-pool.ts` hold the
  Supabase queries for pages. Pages and components get data from these modules, not from
  the client directly. The search API (`src/app/api/search/route.ts`) runs its own query.
- `src/lib/supabase.ts` creates the one client with `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never put a secret or service-role key in `web/`.
- `src/lib/site.ts` holds `REPO_URL` and the navigation. `NAV_ITEMS` drives the desktop header
  (`DesktopNav`): Explore first, then the "Benchmarks" (employers, occupations) and
  "Findings" (analysis pages) dropdowns, then Sources. Add a page to a group instead of
  widening the header. `NAV_LINKS` is the same list flattened for the
  mobile menu.
- `src/lib/pages.ts` holds each top-level page's title and description. Page metadata
  (`pageMetadata(PAGES.x)`), `sitemap.xml`, `llms.txt`, and JSON-LD all read from it. A new
  page gets an entry there, plus a `<JsonLd>` node from `src/lib/json-ld.ts`.
- `/explore` is the exception to `force-dynamic`: it reads about 2,800 employers and 6,600
  labor-pool cells (`src/lib/explore.ts`), so it rebuilds once a day (`revalidate = 86400`)
  and sends the rows packed (`pack`/`unpack` in `src/lib/explore-model.ts`). Client
  components import types and constants from `explore-model.ts`, never from `explore.ts`.
- `robots.ts`, `sitemap.ts`, and `llms.txt/route.ts` in `src/app/` build those files. The
  sitemap lists employers with at least 10 H-1B filings in FY2025, not all 180,000.
- Employer URLs: `/employers/<ticker>` for EIN-confirmed public companies, otherwise
  `/employers/<name-slug>-<id>` (`src/lib/employer-path.ts`, `docs/employer-tickers-method.md`).
  Build links with `getEmployerLinker()` (server) or `employerPath()` (client); never write
  `/employers/${id}` by hand. Old id URLs and stale slugs 308-redirect to the canonical URL.
- Subsidiaries of public companies get a "Subsidiary of <parent> <TICKER>" chip and are found by a
  search for the parent's ticker (`employer_parents`, `docs/employer-parents-method.md`,
  `src/components/employer-parent.tsx`). The parent ticker never becomes the subsidiary's URL.
- Employer flags ("Underpaid", "Layoffs") follow `docs/employer-flags-method.md`
  (`src/lib/employer-flags.ts`, `src/components/employer-flags.tsx`).

## Adding a /pay-vs-market finding

1. Write the method in `docs/<topic>-method.md`.
2. Add the loader in `etl/`, the table or view and its public-read policy in
   `etl/schema.sql`, and the query in `src/lib/cheap-labor.ts`.
3. Render it with `EvidenceSection` (`index`, `title`, `limits`, `source`). Put detail
   tables in `EvidenceDetails`. Link the method with `${REPO_URL}/blob/main/docs/...`.
4. Add the finding to the table in the root `AGENTS.md`.
5. If the finding uses a new file, add it to `src/lib/sources.ts` (the `/sources` page).

## Layout rules

- Every page uses the one container from `layout.tsx` (`max-w-6xl`, the same as the nav).
  Do not add a page-level `max-w-*` or `mx-auto` wrapper. Cap prose at a reading measure
  (`max-w-3xl` or `max-w-2xl`, left-aligned) and let tables and charts use the full width.
- No horizontal page overflow at phone width. Wrap tables in `overflow-x-auto`.
- Use `<table data-hide="2 5">` (1-based columns) to hide less important columns on phones,
  and `data-hide-md` for tablets (`src/app/globals.css`).
- Format numbers with `src/lib/format.ts` (`fmtInt`, `fmtPct`, `fmtMoney`, `fmtCompact`).
  Number cells use `tabular-nums` (Inter figures), not a monospace font.

## Design system

The root `DESIGN.md` (Unbound) is the source. The app applies it like this:

- **Colors.** `src/app/tokens.css` is the token block from `DESIGN.md`, copied verbatim.
  `globals.css` binds each token to a Tailwind utility by layer: `bg-neutral-primary`,
  `text-neutral-secondary`, `border-neutral-tertiary`, `bg-chart-accent-primary`, and so on.
  The default Tailwind palette is off (`--color-*: initial`), so `text-zinc-500` or
  `bg-emerald-400` generates nothing. Never use raw hex values or arbitrary colors.
- **Chart tokens are for data only** (bars, legends, reference lines). UI chrome uses the
  `bg`/`text`/`border` tokens.
- **Fonts.** `layout.tsx` loads the families with `next/font`. Bind to roles: `font-ui`,
  `font-body`, `font-display`, `font-brand` (wordmark only), `font-code` (codes such as SOC
  and `⌘K`), `font-dropcap`.
- **Type scale** (`globals.css` utilities): `type-hero` (home only), `type-title` (page h1),
  `type-heading` (h2), `type-statement` (editorial statement headings), `type-body` (authored
  paragraphs in serif), `type-small` (supporting prose in cards and asides), `type-figure`
  (headline numbers), `type-meta` (sources, notes), `type-promo`. Authored copy is serif;
  navigation, tables, and data are sans. Running text uses two sizes only: `type-body`, then
  `type-small`/`type-meta`. Set a lead sentence apart by weight, not by a size in between,
  and do not add one-off sizes such as `text-[17px]`.
- **Helpers:** `link` (inline accent link), `dropcap` (article opening), `ink-art` (line art
  that inverts in dark mode), `shadow-elevated`.
- **Shared components:** `StatCard`, `YearTabs`, `Eyebrow`, `FiscalYearTag`, `HeaderArt` (an
  engraving behind a sub-page header; the parent must be `relative`).
- **Interactive charts** (`src/components/explore/`) use Observable Plot. `usePalette()` resolves
  the chart tokens to rgb() values (Plot interpolates colors, so it cannot use `var()`), and
  `PlotFigure` rebuilds a chart when its width, the color scheme, or its memoized builder
  changes. Each chart sits in an `ExploreFigure`: controls, a readout sentence, the chart,
  then notes, source, and method. Labels go through `placeLabels` so they do not overlap.
  The dev server serves charts only on `localhost`; Next blocks dev assets on `127.0.0.1`.
- **Light and dark** follow the OS. Lightning CSS compiles `light-dark()` into
  `--lightningcss-light`/`--lightningcss-dark` toggles driven by `prefers-color-scheme`, so
  setting `color-scheme` on an element does not switch the tokens. To preview light mode in
  a dark-mode browser, set `--lightningcss-light: initial` and `--lightningcss-dark: " "` on
  `<html>`.
- **Images.** The Capitol engraving (`public/capitol-engraving.webp`) and the Open Graph card
  (`src/app/opengraph-image.png`, `twitter-image.png`) and the sub-page engravings
  (`src/assets/art/`) were made with vmotif (webrenew workspace, canvas
  `b5c45e0d-2606-4eaf-803a-470061bf234b`). Make new art there, with the Capitol engraving as
  the style reference.

