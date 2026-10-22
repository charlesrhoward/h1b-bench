-- Disposable database only. PUBLIC EXECUTE is independent of table/sequence defaults.
begin;
create function public.grants_rpc_sentinel() returns integer
language sql stable security invoker as 'select 7';
do $$ begin
  if not exists (
    select 1 from pg_proc p cross join lateral aclexplode(
      coalesce(p.proacl, acldefault('f', p.proowner))) a
    where p.oid = 'public.grants_rpc_sentinel()'::regprocedure
      and a.grantee = 0 and a.privilege_type = 'EXECUTE'
  ) then raise exception 'Expected the reviewed PUBLIC EXECUTE function default'; end if;
end $$;
set local role anon;
do $$ begin
  if public.grants_rpc_sentinel() <> 7 then raise exception 'Anon RPC execution failed'; end if;
  perform * from public.search_employers('grants-proof', 1);
end $$;
set local role authenticated;
do $$ begin
  if public.grants_rpc_sentinel() <> 7 then raise exception 'Authenticated RPC execution failed'; end if;
  perform * from public.search_employers('grants-proof', 1);
end $$;
set local role service_role;
do $$ begin
  if public.grants_rpc_sentinel() <> 7 then raise exception 'Service RPC execution failed'; end if;
  perform * from public.search_employers('grants-proof', 1);
end $$;
reset role;
revoke execute on function public.grants_rpc_sentinel() from public, anon, authenticated, service_role;
revoke execute on function public.search_employers(text, integer) from public, anon, authenticated, service_role;
set local role anon;
do $$ begin
  if has_function_privilege(current_user, 'public.search_employers(text,integer)', 'EXECUTE')
    then raise exception 'RPC negative control still has EXECUTE'; end if;
  begin
    perform public.grants_rpc_sentinel();
    raise exception 'Sentinel unexpectedly executable without EXECUTE';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.search_employers('grants-proof', 1);
    raise exception 'Search RPC unexpectedly executable without EXECUTE';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
begin read only;
do $$ begin
  if to_regprocedure('public.grants_rpc_sentinel()') is not null
    then raise exception 'RPC fixture did not roll back'; end if;
  if exists (select 1 from unnest(array['anon','authenticated','service_role']) r(role)
    where not has_function_privilege(r.role, 'public.search_employers(text,integer)', 'EXECUTE'))
    then raise exception 'RPC EXECUTE revokes did not roll back'; end if;
end $$;
rollback;
