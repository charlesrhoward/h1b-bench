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
pnpm install                     # also installs the pre-commit and pre-push hooks
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

The same checks run locally and in CI (`.github/workflows/ci.yml`). CI runs `lint`,
`typecheck`, `ruff`, and `build` as parallel jobs. The `preflight` job passes only when all
four pass; it is the required check on `main`, so a PR that fails any of them cannot merge.

| Check     | Command (from `web/`) | Runs on                     |
|-----------|-----------------------|-----------------------------|
| Lint      | `pnpm lint`           | pre-commit + pre-push + CI  |
| Typecheck | `pnpm typecheck`      | pre-commit + pre-push + CI  |
| Build     | `pnpm build`          | pre-push + CI               |
| Ruff (`etl/`) | `../scripts/check-etl.sh` | pre-push + CI           |

`pnpm preflight` runs all four. The pre-push hook runs it, so a push that would fail CI
fails on your machine first. `scripts/check-etl.sh` uses `./venv/bin/ruff` when it is
ruff 0.16.10, otherwise `uvx ruff@0.16.10` or `pipx run ruff==0.16.10`.

Lint rules live in `web/eslint.shared-rules.mjs`. Every rule is an error, and warnings
also fail (`--max-warnings 0`). The main limits:

- Files: 500 lines max, blank lines and comments included
- Functions: cyclomatic complexity 8, nesting depth 3, 4 parameters, 3 nested callbacks
- No `any`, no nested ternaries, no `console.log` (`console.warn`/`console.error` are allowed)
- Prefix unused variables and arguments with `_`

There are no exceptions:

- No rule runs at `warn`. The config raises every preset and local rule to `error`.
- Inline `eslint-disable` / `eslint-enable` comments are ignored and fail lint.
- `@ts-ignore`, `@ts-nocheck`, and `@ts-expect-error` fail lint.
- The ignore list holds generated output only (`.next`, `out`, `build`, `next-env.d.ts`).
  Legacy code is not grandfathered.

If a change trips a limit, split the code. Do not loosen a rule for one file.

Run the checks by hand at any time:

```sh
cd web && pnpm preflight                 # lint, typecheck, build, etl checks
scripts/check-etl.sh                     # etl checks only, from the repo root
```

### Python (`etl/`)

Ruff rules live in `ruff.toml` and match the web limits where Python has an equivalent:
complexity 8, nesting depth 3, 4 arguments, no unused imports/variables/arguments,
no else-after-return, no `Any` annotations, and no `print`. CI also caps files at 500 lines.

Scripts log through `log = logging.getLogger(__name__)`. Each script's `__main__` block
calls `configure_logging()` from `etl/cli_log.py`, which writes plain messages to stdout. Install the
version CI pins: `./venv/bin/pip install ruff==0.16.10`.

The same no-exceptions rule applies. `ruff.toml` has no ignore list and no per-file ignores.
CI runs with `--ignore-noqa` and fails on any `# noqa`, `# ruff: noqa`, or `# type: ignore`
comment.

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
