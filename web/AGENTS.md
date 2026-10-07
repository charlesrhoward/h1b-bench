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

## Adding a /cheap-labor finding

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

