-- Durable, cross-instance rate limiting for paid endpoints (app/api/copilot).
--
-- The in-memory limiter (lib/security/rate-limit.ts) is per server instance
-- and resets on every cold start, so on Vercel it can't enforce a real limit.
-- This is a fixed-window counter: one row per key, holding the current
-- window's start and hit count. rate_limit_hit() upserts it atomically
-- (INSERT … ON CONFLICT takes the row lock, so concurrent calls for the same
-- key serialize) and returns whether this hit is within the limit.
--
-- Access: only through the SECURITY DEFINER function, and only for
-- service_role (the server route's admin client). RLS is enabled with no
-- policies and no table grants, so anon/authenticated can neither read nor
-- write buckets, nor call the function.
--
-- Machine-owned counters, never edited by a person, so there is no
-- updated_by column (same reasoning as copilot_logs in 0006); updated_at is
-- kept for debugging.
--
-- Windows are aligned to the Unix epoch, so a 1-day window resets at 00:00
-- UTC (05:00 Tashkent).

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits int not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists rate_limits_expires_at_idx on public.rate_limits (expires_at);

alter table public.rate_limits enable row level security;

revoke all on table public.rate_limits from public, anon, authenticated;

create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_hits int;
begin
  if p_key is null or length(p_key) = 0 or length(p_key) > 512 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'rate_limit_hit: invalid arguments';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  -- Cleanup inline instead of a cron job: drop buckets whose window is over.
  -- The table holds at most one row per (endpoint, window size, user), so
  -- this stays a small indexed delete.
  delete from public.rate_limits where expires_at < v_now and key <> p_key;

  insert into public.rate_limits as rl (key, window_start, hits, expires_at, updated_at)
  values (p_key, v_window_start, 1, v_window_start + make_interval(secs => p_window_seconds), v_now)
  on conflict (key) do update
    set hits = case when rl.window_start = excluded.window_start then rl.hits + 1 else 1 end,
        window_start = excluded.window_start,
        expires_at = excluded.expires_at,
        updated_at = v_now
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
