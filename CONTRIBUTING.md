# Contributing to H1B Bench

Issues and PRs are welcome. The most valuable contributions right now:

- **Employer entity resolution** — merging "Google LLC" and "GOOGLE INC." (FEIN-based or otherwise)
- **PERM ingestion** — green card disclosure data alongside LCAs
- **Frontend visualizations** — wage distributions, employer compare pages

See the [roadmap](README.md#roadmap) for the wider list. For anything large, open an issue
first so we can agree on the approach before you build it.

## Setup

### Frontend (`web/`)

```sh
cd web
pnpm install                     # also installs the pre-commit hook
cp .env.example .env.local       # point at your own Supabase project
pnpm dev
```

The frontend only needs a publishable (anon) key. The database is read-only to the public
through row-level security.

### Data pipeline (`etl/`)

Python 3 with pandas, openpyxl, pyarrow, and requests. The full walkthrough (download →
parse → load) is in [Reproducing the dataset](README.md#reproducing-the-dataset). Raw and
processed data live in `data/` and are gitignored — never commit them.

## Preflight

The same checks run locally and in CI (`.github/workflows/ci.yml`). The `preflight` check
is required on `main`, so a PR that fails it cannot merge.

| Check     | Command (from `web/`)                | Runs on               |
|-----------|--------------------------------------|-----------------------|
| Lint      | `pnpm exec eslint src --max-warnings 0` | pre-commit + CI    |
| Typecheck | `pnpm exec tsc --noEmit`             | pre-commit + CI       |
| Build     | `pnpm build`                         | CI                    |

ESLint caps files at 500 lines, cyclomatic complexity at 10, and nesting depth at 3. If a
change trips a limit, split the code rather than disabling the rule.

Run all three before you push:

```sh
cd web && pnpm exec eslint src --max-warnings 0 && pnpm exec tsc --noEmit && pnpm build
```

## Pull requests

1. Branch from `main` (`feat/…`, `fix/…`, `docs/…`).
2. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and
   PR titles: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
3. Keep each PR to one change. Describe what changed and how you verified it, and add a
   screenshot for UI changes.
4. PRs are squash-merged once `preflight` passes.

## Data accuracy

H1B Bench presents government data, so correctness matters more than features:

- An LCA certification is a filing step, not a visa grant. Copy and UI must not suggest
  otherwise.
- If you change how wages, dates, or employer names are normalized, say so in the PR and
  note which aggregate tables need a reload.
- Never fabricate, sample, or "fill in" data. Missing values stay missing.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE). The underlying DOL data is public domain (17 U.S.C. § 105).
