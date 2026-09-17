-- Publish gate audit trail + manager notification inbox (S23).
--
-- Both tables are written only by server code through the service-role
-- client (lib/agents/publish-gate/index.ts, lib/agents/stale-scan.ts) — there
-- is deliberately no insert policy for `authenticated`. Managers read both;
-- the only write a manager's own session may make is marking a notification
-- read (lib/notifications/actions.ts), enforced by a column-level GRANT on
-- read_at plus the update policy below.
--
-- Explicit GRANTs as well as RLS: tables created by hand-run SQL in this
-- project don't pick up Supabase's default privileges (see 0003).

-- === admin_notifications =========================================================

-- updated_at/updated_by (CLAUDE.md section 7) record who marked a row read.
-- They are stamped by the trigger below from the caller's JWT, never taken
-- from the request body, so a manager can't write someone else's email.
create table if not exists public.admin_notifications (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('gate_blocked', 'stale_content', 'missing_ru', 'scan_summary')),
  severity text not null check (severity in ('info', 'warning', 'error')),
  title text not null,
  body text,
  table_name text,
  row_id text,
  href text,
  read_at timestamptz,
  actor text,
  updated_at timestamptz not null default now(),
  updated_by text
);

create index if not exists admin_notifications_read_created_idx
  on public.admin_notifications (read_at nulls first, created_at desc);

create or replace function public.stamp_admin_notification_update()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email';
  return new;
end;
$$;

create trigger trg_stamp_admin_notification_update
  before update on public.admin_notifications
  for each row execute function public.stamp_admin_notification_update();

alter table public.admin_notifications enable row level security;

create policy "admin_notifications_manager_select" on public.admin_notifications
  for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "admin_notifications_manager_update" on public.admin_notifications
  for update to authenticated
  using ((auth.jwt()->'app_metadata'->>'role') = 'manager')
  with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');

grant select on table public.admin_notifications to authenticated;
-- Column-level: a manager may only flip read_at. The trigger's own writes to
-- updated_at/updated_by are not subject to this column list.
grant update (read_at) on table public.admin_notifications to authenticated;
grant all on table public.admin_notifications to service_role;
grant usage, select on sequence public.admin_notifications_id_seq to service_role;

-- === content_gate_reports ========================================================

-- Append-only machine log (one row per gate run), so no updated_at/updated_by
-- columns — rows are never edited after insert, same as copilot_logs (0006).
create table if not exists public.content_gate_reports (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  table_name text not null,
  row_id text not null,
  passed boolean not null,
  issues jsonb not null default '[]',
  actor text
);

create index if not exists content_gate_reports_table_row_created_idx
  on public.content_gate_reports (table_name, row_id, created_at desc);

alter table public.content_gate_reports enable row level security;

create policy "content_gate_reports_manager_select" on public.content_gate_reports
  for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

grant select on table public.content_gate_reports to authenticated;
grant all on table public.content_gate_reports to service_role;
grant usage, select on sequence public.content_gate_reports_id_seq to service_role;
