# Preserve Data API access after October 30

The schema and the standalone grants artifact preserve production's current
access. They do not change loader credentials, data, RLS or temporary policies.

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

The contract includes 33 tables, 2 ordinary views, 2 materialized views and
2 sequences. It covers direct and effective permissions, explicit column ACLs,
grant options, ownership, RLS flags, schema access and API-role inheritance.

`etl/schema.sql` contains the generated grants for fresh builds. The standalone
artifact is `etl/grants/20261022181311_explicit_data_api_grants.sql`.
Keep their grant statements equal. Never replay the create-schema file against production.

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

Production application remains pending. Review the exact grants-only artifact
and refresh the permission snapshot before application. Record an applied change
in the schema history only after its production verification succeeds.
