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
project. Cleanup stops only that unique project.

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

`etl/schema.sql` contains the generated grants for fresh builds. The standalone
artifact is `etl/grants/20261022181311_explicit_data_api_grants.sql`.
The complete artifact, including its transaction wrapper, appears exactly once
between matching markers in the schema. The equality test compares the full
block, including non-GRANT statements. Never replay the create-schema file
against production.

Capture production metadata with `snapshot.sql`. Use `inspect.mjs summary`,
`inspect.mjs grants` and `inspect.mjs compare` to inspect it. Store raw snapshots
outside Git. Refresh the project identity through the live project list first.
The generator stops on inherited access or non-owner grantors.
The before/after comparison includes default privileges. The rebuild contract
omits defaults because the October 30 simulation intentionally changes them.

The source guard checks `etl/schema.sql` directly. It also rejects inline
relation-creation SQL in Python loaders. Put runtime schema DDL in checked SQL
files with explicit grants. Register additional schema files in the configuration.

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

Production application remains pending. Review the exact grants-only artifact
and refresh the permission snapshot before application. Record an applied change
in the schema history only after its production verification succeeds.
