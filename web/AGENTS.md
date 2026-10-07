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
- `src/lib/site.ts` holds `REPO_URL` and the navigation links.

## Adding a /pay-vs-market finding

1. Write the method in `docs/<topic>-method.md`.
2. Add the loader in `etl/`, the table or view and its public-read policy in
   `etl/schema.sql`, and the query in `src/lib/cheap-labor.ts`.
3. Render it with `EvidenceSection` (`index`, `title`, `limits`, `source`). Put detail
   tables in `EvidenceDetails`. Link the method with `${REPO_URL}/blob/main/docs/...`.
4. Add the finding to the table in the root `AGENTS.md`.

## Layout rules

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
  paragraphs in serif), `type-figure` (headline numbers), `type-meta` (sources, notes),
  `type-promo`. Authored copy is serif; navigation, tables, and data are sans.
- **Helpers:** `link` (inline accent link), `dropcap` (article opening), `ink-art` (line art
  that inverts in dark mode), `shadow-elevated`.
- **Shared components:** `StatCard`, `YearTabs`, `Eyebrow`, `FiscalYearTag`.
- **Light and dark** follow the OS. Lightning CSS compiles `light-dark()` into
  `--lightningcss-light`/`--lightningcss-dark` toggles driven by `prefers-color-scheme`, so
  setting `color-scheme` on an element does not switch the tokens. To preview light mode in
  a dark-mode browser, set `--lightningcss-light: initial` and `--lightningcss-dark: " "` on
  `<html>`.
- **Images.** The Capitol engraving (`public/capitol-engraving.webp`) and the Open Graph card
  (`src/app/opengraph-image.png`, `twitter-image.png`) were made with vmotif (webrenew
  workspace, canvas `b5c45e0d-2606-4eaf-803a-470061bf234b`).

