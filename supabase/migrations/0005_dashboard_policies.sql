-- Lets a manager list every operator for the dashboard's operator filter
-- (components/dashboard/OperatorFilter.tsx). allowed_users previously had no
-- policy for `authenticated` at all — 0001_custom_access_token_hook.sql only
-- grants supabase_auth_admin (for the JWT hook) and RLS is already enabled on
-- the table, so managers got "permission denied" with no policy of their own.
-- Same reasoning as 0003_content_tables_grants.sql: RLS alone doesn't grant
-- baseline table access, an explicit GRANT is required too.

grant select on table public.allowed_users to authenticated;

create policy "allowed_users_manager_select_all" on public.allowed_users
  for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
