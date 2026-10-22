# Preserve Data API access after October 30

The schema and the standalone grants artifact preserve production's current
access. They do not change loader credentials, data, RLS or temporary policies.
The broad pre-change ACLs are preserved intentionally for compatibility. They
are not a least-privilege policy. Review any narrowing, including removal of
TRUNCATE or loader write access, as a separate behavior change.

Run these checks from `web/`:

```sh
pnpm security:migration-grants
pnpm test:migration-grants
pnpm test:data-api-grants
```

The database check requires Docker, Supabase CLI 2.120.0 and free ports
56320–56322. It creates a unique disposable project. It never resets an existing
project. Cleanup stops only that unique project. Runs on one host must be
sequential because the ports are fixed; unique IDs isolate state and cleanup.

The check rebuilds the schema with the October 30 defaults. Without the generated
grants block, the same objects lose expected access. The standalone artifact
then restores the complete production permission contract. Reapplication must
change no tuples. New ungranted sentinel objects must remain private for every
table and sequence privilege. INSERT-only and sequence SELECT-only default
grants must fail the sentinel assertion in rolled-back negative controls.
Replay includes every registered schema file in configuration order and keeps
SQL after the generated block. A dependency fixture checks multi-file replay.
Another rolled-back fixture removes all public-schema USAGE, then proves that
the artifact's three explicit USAGE grants restore API-role access.

The contract includes 33 tables, 2 ordinary views, 2 materialized views and
2 sequences. It covers direct and effective permissions, explicit column ACLs,
grant options, ownership, RLS flags, schema ownership/access and API-role inheritance.
It also pins every public policy's command, roles, permissiveness and expressions,
plus ordinary views' options, ownership and writability.

Before any digest comparison, explicit security invariants require RLS on every
public table, invoker security on every ordinary view, and no public-role table
ownership, role inheritance, superuser access or RLS bypass. H1B permits no write
policies or writable views in `security-contract.json`. Refreshing expected
digests cannot bypass these invariants. Temporary loader policies must not be
added to the replayed schema or this contract.

Rolled-back database controls disable RLS, add an anonymous insert policy, remove
view invoker security and change a SELECT policy. Each must be detected, and the
final snapshot must equal the pre-fixture snapshot. These controls run only in
the uniquely named disposable database, never in production.

`etl/schema.sql` contains the generated grants for fresh builds. The standalone
artifact is `etl/grants/20261022181311_explicit_data_api_grants.sql`.
The complete artifact, including its transaction wrapper, appears exactly once
between matching markers in the schema. The equality test compares the full
block, including non-GRANT statements. Never replay the create-schema file
against production.

Capture production metadata with `snapshot.sql`. Use `inspect.mjs summary`,
`inspect.mjs grants` and `inspect.mjs compare` to inspect it. Store raw snapshots
outside Git. Snapshot output inside any Git repository is rejected, including
paths reached through symlinks. Refresh project identity through the live list first.
The generator stops on inherited access or non-owner grantors.
It also rejects non-owner relation/column grants to additional roles instead
of silently omitting them. Review those roles before generating an artifact.
The before/after comparison includes default privileges. The rebuild contract
omits defaults because the October 30 simulation intentionally changes them.

The source guard checks `etl/schema.sql` directly. It also rejects inline
relation-creation SQL in Python loaders. Put runtime schema DDL in checked SQL
files with explicit grants. Register additional schema files in the configuration.
Its tested `migrations` adapter is retained for repositories that use a migration
history; H1B's only configured adapter is `schema`.

Every new table, view, materialized view or sequence needs an explicit reviewed
access decision in the schema SQL; no automatic API grants are restored. When
regenerating the embedded baseline, update its standalone artifact together
and review the exact tuple changes. The source guard, artifact equality check
and database contract enforce this before merge. Do not restore blanket default
grants: they would undo October 30's deny-by-default protection.

Update the expected contract only after a review of the intended role access.
Record the tuple diff. Do not replace expected digests merely because CI fails.

## Diagnose and update a contract

Save actual replay rows for inspection:

```sh
cd web
pnpm test:data-api-grants --snapshot-dir /private/path/proofs
```

Each run creates a private output directory and saves snapshots before and
after the baseline and reapplication. A mismatch names the failing categories
and the actual-row file. Without the option, failed snapshots remain in the
reported scratch directory. CI uploads these metadata snapshots as the
`data-api-permission-snapshots` artifact when the database job fails.

From the repository root, capture fresh production metadata with the live
project ref. Keep snapshots outside Git:

```sh
umask 077
supabase db query --linked --project-ref PROJECT_REF \
  --file scripts/data-api-grants/snapshot.sql --output json > /private/path/production.json
node scripts/data-api-grants/inspect.mjs compare /private/path/production.json /private/path/proofs/proof-ID/with-baseline.json
```

This prints exact added and removed rows. Default-privilege differences are
expected only in the local October 30 simulation. Investigate other differences
before changing the contract. After the intended access change is reviewed and
verified in production, generate its summary from that production snapshot:

```sh
node scripts/data-api-grants/inspect.mjs summary /private/path/production.json > scripts/data-api-grants/expected-summary.json
```

Review the tuple and summary diffs together. Never refresh the contract from a
failed replay just to make the check pass.

Production baseline `20261022181311` was applied on 2026-10-22 at 21:34 UTC
from the artifact merged in PR #49 (`6abf1af`). All 120 GRANT statements matched
the fresh production snapshot before application. The before/after comparison
found zero changes across all nine contract categories and default privileges.
Public routine definitions, ownership, configuration and ACLs also matched.
The production ledger records the version and its 120 statements; the applied
change is recorded in the schema history. No application data was changed.

For any future application, review the exact grants-only artifact and refresh
the permission snapshot first. Record an applied change in the schema history
only after its production verification succeeds.

## RPC execution scope

Function EXECUTE defaults are separate from October 30's table/sequence change.
The proof invokes `search_employers` as anon, authenticated and service_role,
and checks a fresh invoker-function sentinel with the existing PUBLIC EXECUTE
default. Rolled-back revokes must deny both the actual search RPC and the
sentinel. No production function grants or defaults are changed. This is an
execution check, not a full catalog contract for every routine or definer body.
