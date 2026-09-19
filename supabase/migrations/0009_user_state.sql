-- Durable per-user state: onboarding progress, the daily checklist, the last
-- script position, and (from later tasks) pins/recents/changelog read marks.
--
-- Until now all of this lived only in localStorage, so it was lost on another
-- device or after clearing the browser, and managers could not see onboarding
-- progress at all. One narrow key/value table instead of a column per feature:
-- new keys are added in lib/user-state/keys.ts (schema + default) with no
-- migration, and every value is validated with zod on the way in and out.
--
-- Read/written straight from the browser client under RLS (hooks/useUserState.ts)
-- — no route handler — so operator pages stay statically prerenderable
-- (CLAUDE.md sections 3-4). The client never sends an email: user_email
-- defaults to the JWT's own claim and the policies below compare against the
-- same claim, so a client cannot write into (or read) another operator's row
-- whatever it puts in the payload.
--
-- updated_at is supplied by the client and is the conflict resolver: the
-- newest value wins when the same key was changed on two devices (see
-- lib/user-state/merge.ts). It is deliberately not forced to now() by a
-- trigger — a queued offline write must keep the time the operator actually
-- made the change, not the time it finally reached the server.
--
-- No updated_by column (CLAUDE.md section 7): rows are owned and written only
-- by the user they belong to, never edited by another person, so user_email
-- already is the actor — same reasoning as copilot_logs in 0006.
--
-- Explicit GRANTs as well as RLS: tables created by hand-run SQL in this
-- project don't pick up Supabase's default privileges (see 0003).

create table if not exists public.user_state (
  user_email text not null default (auth.jwt() ->> 'email'),
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_email, key),
  -- Bounded rows: the largest real value is a 14-day daily checklist, a few
  -- hundred bytes. 16 KiB leaves room without letting a client park a blob here.
  constraint user_state_value_size check (octet_length(value::text) <= 16384),
  -- Lowercase letters/digits separated by single dots or dashes, e.g.
  -- `onboarding.v2`, `daily.2026-09-19`, `scripts.position` — keeps the key
  -- space greppable and prefix-queryable (the daily prune is a range scan).
  constraint user_state_key_format check (key ~ '^[a-z0-9]+([.-][a-z0-9]+)*$' and length(key) <= 64)
);

-- The manager dashboard reads one key across all operators
-- (lib/dashboard/quality.ts), which the (user_email, key) primary key can't serve.
create index if not exists user_state_key_idx on public.user_state (key);

alter table public.user_state enable row level security;

create policy "user_state_own_select" on public.user_state
  for select to authenticated using (user_email = (auth.jwt() ->> 'email'));

create policy "user_state_own_insert" on public.user_state
  for insert to authenticated with check (user_email = (auth.jwt() ->> 'email'));

create policy "user_state_own_update" on public.user_state
  for update to authenticated
  using (user_email = (auth.jwt() ->> 'email'))
  with check (user_email = (auth.jwt() ->> 'email'));

create policy "user_state_own_delete" on public.user_state
  for delete to authenticated using (user_email = (auth.jwt() ->> 'email'));

-- Read-only, and only for managers: the onboarding progress table on
-- /dashboard/quality. Deliberately no manager insert/update/delete policy —
-- nobody edits another operator's state.
create policy "user_state_manager_select_all" on public.user_state
  for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

grant select, insert, update, delete on table public.user_state to authenticated;
grant all on table public.user_state to service_role;
