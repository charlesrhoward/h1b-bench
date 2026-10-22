-- Read metadata only. No application rows or credentials are exported.
begin isolation level repeatable read read only;
with objects as (
  select c.oid, n.nspname, c.relname, c.relkind, c.relowner,
    c.relacl, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p','f','v','m','S')
), api_roles as (
  select oid, rolname, rolinherit, rolbypassrls, rolsuper
  from pg_roles where rolname in ('anon','authenticated','service_role')
), relation_acl as (
  select o.nspname as schema, o.relname as name, o.relkind as kind,
    pg_get_userbyid(o.relowner) as owner,
    case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,
    pg_get_userbyid(a.grantor) as grantor, a.privilege_type as privilege,
    a.is_grantable as grantable
  from objects o cross join lateral aclexplode(coalesce(o.relacl,
    acldefault(case when o.relkind = 'S' then 's'::"char" else 'r'::"char" end,
      o.relowner))) a
), column_acl as (
  select o.nspname as schema, o.relname as name, col.attname as column,
    pg_get_userbyid(o.relowner) as owner,
    case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,
    pg_get_userbyid(a.grantor) as grantor, a.privilege_type as privilege,
    a.is_grantable as grantable
  from objects o join pg_attribute col on col.attrelid = o.oid
  cross join lateral aclexplode(col.attacl) a
  where col.attnum > 0 and not col.attisdropped
), inventory as (
  select o.nspname as schema, o.relname as name, o.relkind as kind,
    pg_get_userbyid(o.relowner) as owner, o.relrowsecurity as rls,
    o.relforcerowsecurity as force_rls
  from objects o
), effective_relations as (
  select o.relname as name, o.relkind as kind, r.rolname as role,
    p.privilege_type as privilege,
    case when o.relkind = 'S'
      then has_sequence_privilege(r.oid, o.oid, p.privilege_type)
      else has_table_privilege(r.oid, o.oid, p.privilege_type) end as allowed
  from objects o cross join api_roles r
  cross join lateral aclexplode(acldefault(
    case when o.relkind = 'S' then 's'::"char" else 'r'::"char" end,
    o.relowner)) p
), effective_columns as (
  select o.relname as name, col.attname as column, r.rolname as role,
    p.privilege, has_column_privilege(r.oid, o.oid, col.attnum, p.privilege) as allowed
  from objects o join pg_attribute col on col.attrelid = o.oid
  cross join api_roles r
  cross join (values ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) p(privilege)
  where o.relkind <> 'S' and col.attnum > 0 and not col.attisdropped
), roles as (
  select r.rolname as role, r.rolinherit as inherit, r.rolbypassrls as bypass_rls,
    r.rolsuper as superuser, has_schema_privilege(r.oid, 'public', 'USAGE') as schema_usage,
    array(select p.rolname from pg_roles p where p.oid <> r.oid
      and pg_has_role(r.oid, p.oid, 'USAGE') order by p.rolname collate "C") as inherited
  from api_roles r
), schema_acl as (
  select pg_get_userbyid(n.nspowner) as owner,
    case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,
    pg_get_userbyid(a.grantor) as grantor, a.privilege_type as privilege,
    a.is_grantable as grantable
  from pg_namespace n cross join lateral aclexplode(
    coalesce(n.nspacl, acldefault('n', n.nspowner))) a
  where n.nspname = 'public'
), defaults as (
  select pg_get_userbyid(d.defaclrole) as creator,
    coalesce(n.nspname, '*') as schema, d.defaclobjtype as kind,
    case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,
    a.privilege_type as privilege, a.is_grantable as grantable
  from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral aclexplode(d.defaclacl) a
  where d.defaclnamespace = 0 or n.nspname = 'public'
), records as (
  select 'objects' as category, to_jsonb(x) as item from inventory x
  union all select 'relation_acl', to_jsonb(x) from relation_acl x
  union all select 'column_acl', to_jsonb(x) from column_acl x
  union all select 'effective_relations', to_jsonb(x) from effective_relations x
  union all select 'effective_columns', to_jsonb(x) from effective_columns x
  union all select 'roles', to_jsonb(x) from roles x
  union all select 'schema_acl', to_jsonb(x) from schema_acl x
  union all select 'defaults', to_jsonb(x) from defaults x
), grouped as (
  select category, jsonb_agg(item order by item::text collate "C") as items
  from records group by category
)
select jsonb_object_agg(category, items) as snapshot from grouped;
commit;
