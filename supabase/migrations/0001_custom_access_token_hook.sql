-- Enable in Dashboard → Authentication → Hooks → Custom Access Token
-- Adds app_metadata.role to every issued access token, from public.allowed_users.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb := coalesce(event->'claims', '{}'::jsonb);
  app_meta jsonb := coalesce(claims->'app_metadata', '{}'::jsonb);
  user_email text := claims->>'email';
  user_role text;
begin
  select role into user_role from public.allowed_users where email = user_email limit 1;
  app_meta := jsonb_set(app_meta, '{role}', to_jsonb(coalesce(user_role, 'none')), true);
  claims := jsonb_set(claims, '{app_metadata}', app_meta, true);
  return jsonb_set(event, '{claims}', claims, true);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on table public.allowed_users to supabase_auth_admin;
-- allowed_users has RLS: let the auth admin role read it for the hook.
drop policy if exists "auth admin reads allowed_users" on public.allowed_users;
create policy "auth admin reads allowed_users" on public.allowed_users
  for select to supabase_auth_admin using (true);
