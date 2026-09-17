-- Copilot question/answer audit log (app/api/copilot/route.ts).
--
-- Written only by the server route through the service-role client, with the
-- email taken from the verified session — there is deliberately no insert
-- policy for `authenticated`. Managers can read it; operators cannot (the
-- question text lives here and nowhere in operator-visible telemetry).
--
-- Append-only machine log, so no updated_at/updated_by columns: rows are
-- never edited after insert.
--
-- Explicit GRANTs as well as RLS: tables created by hand-run SQL in this
-- project don't pick up Supabase's default privileges (see 0003).

create table if not exists public.copilot_logs (
  id bigserial primary key,
  ts timestamptz not null default now(),
  email text,
  locale text,
  question text,
  hit_ids text[],
  answer_chars int,
  latency_ms int,
  model text,
  finish_reason text,
  status text not null check (status in ('ok', 'no_hits', 'error', 'rate_limited'))
);

create index if not exists copilot_logs_ts_desc_idx on public.copilot_logs (ts desc);

alter table public.copilot_logs enable row level security;

create policy "copilot_logs_manager_select" on public.copilot_logs
  for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

grant select on table public.copilot_logs to authenticated;
grant all on table public.copilot_logs to service_role;
grant usage, select on sequence public.copilot_logs_id_seq to service_role;
