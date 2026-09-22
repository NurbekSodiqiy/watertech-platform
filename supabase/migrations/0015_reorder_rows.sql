-- Audit-2 / S06 — one statement that reorders a whole content list.
--
-- `sort_order` decides the order operators read a list in, and until now
-- nothing wrote it outside the seed script: every row created through the CMS
-- got 0 (the column default) and sat wherever Postgres felt like returning it.
-- The action factory now appends new rows at max + 1, and this function is the
-- other half — moving rows that already exist.
--
-- Why a function and not ten UPDATEs from the app:
--
--   1. All or nothing. A reorder that half-applied would leave the list in an
--      order nobody chose. A function body is one statement to the caller, so
--      a raise anywhere inside it rolls the whole thing back.
--   2. Version-guarded, like every other admin write. Each row moves only if
--      its `version` still matches what the manager's page had; if another
--      manager saved one of them first, the whole reorder is refused with
--      SQLSTATE WT409 and the UI asks for a refresh (lib/admin/errors.ts's
--      `version_conflict`).
--
-- SECURITY INVOKER: it runs as the calling manager, so the per-table
-- `<t>_manager_update` policy from 0014 is still what authorises each UPDATE,
-- and the `trg_stamp_content_actor` / `trg_snapshot_version` triggers (0013)
-- record the actor and the pre-edit snapshot exactly as a normal save does.
-- The is_manager() check below is for the error message, not the security —
-- RLS would refuse an operator's UPDATE regardless.
--
-- One consequence worth knowing: because these are ordinary UPDATEs, each
-- moved row gets a content_versions snapshot and a version bump, exactly like
-- any other edit. A reorder of a long list therefore shows up as one history
-- entry per row — that is the audit trail working, not a leak.
--
-- APPLY ORDER (see docs/MIGRATIONS.md): after 0014. Re-running it is safe.

begin;

-- =============================================================================
-- Section 0 — preflight
-- =============================================================================
-- private.is_manager() comes from 0014; the content tables from 0002/0010-0012.

do $preflight$
declare
  required constant text[] := array[
    'content_scripts', 'content_objections', 'content_faqs', 'content_competitors',
    'content_package_groups', 'content_packages', 'content_products',
    'content_changelog', 'content_contacts', 'content_sops'
  ];
  t text;
  missing text[] := '{}';
begin
  if to_regprocedure('private.is_manager()') is null then
    raise exception 'run 0014_role_gated_rls.sql first: private.is_manager() is missing';
  end if;

  foreach t in array required loop
    if to_regclass('public.' || t) is null then
      missing := missing || t;
    end if;
  end loop;

  if array_length(missing, 1) is not null then
    raise exception 'missing content tables: %. Run 0002 and 0010-0012 first.', array_to_string(missing, ', ');
  end if;
end
$preflight$;

-- =============================================================================
-- Section 1 — public.reorder_content_rows(text, text[], int[])
-- =============================================================================
-- p_ids[i] gets sort_order = i - 1 (zero-based, matching the array index the
-- UI sends), and only while p_versions[i] matches. `format('%I')` on a name
-- checked against the allow-list is what keeps the dynamic SQL injection-free.

create or replace function public.reorder_content_rows(
  p_table text,
  p_ids text[],
  p_versions int[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  allowed constant text[] := array[
    'content_scripts', 'content_objections', 'content_faqs', 'content_competitors',
    'content_package_groups', 'content_packages', 'content_products',
    'content_changelog', 'content_contacts', 'content_sops'
  ];
  total int := coalesce(array_length(p_ids, 1), 0);
  moved int;
  i int;
begin
  if not (select private.is_manager()) then
    raise exception 'reorder_content_rows: manager role required'
      using errcode = 'WT403';
  end if;

  if not (p_table = any(allowed)) then
    raise exception 'reorder_content_rows: unknown table %', p_table
      using errcode = 'WT400';
  end if;

  if total = 0 or total <> coalesce(array_length(p_versions, 1), 0) then
    raise exception 'reorder_content_rows: ids and versions must be the same non-empty length'
      using errcode = 'WT400';
  end if;

  if total <> (select count(distinct id) from unnest(p_ids) as id) then
    raise exception 'reorder_content_rows: duplicate id in the requested order'
      using errcode = 'WT400';
  end if;

  for i in 1..total loop
    execute format(
      'update public.%I set sort_order = $1 where id = $2 and version = $3', p_table
    ) using i - 1, p_ids[i], p_versions[i];

    get diagnostics moved = row_count;
    if moved <> 1 then
      -- No row with that id and version: either it is gone or someone saved
      -- it since this page was loaded. Either way the order the manager saw
      -- is stale, so nothing at all is written.
      raise exception 'reorder_content_rows: % row % changed or is missing', p_table, p_ids[i]
        using errcode = 'WT409';
    end if;
  end loop;
end;
$$;

comment on function public.reorder_content_rows(text, text[], int[]) is
  'Sets sort_order = array index for a whole content list, guarded on each row''s version. Raises WT409 on a stale version, WT400 on bad arguments, WT403 for a non-manager. SECURITY INVOKER: per-row RLS still applies.';

-- `create function` grants EXECUTE to PUBLIC — revoke first, then grant the
-- one role that calls it. service_role never does (content writes go through
-- the manager's own session, CLAUDE.md §7).
revoke all on function public.reorder_content_rows(text, text[], int[]) from public, anon;
grant execute on function public.reorder_content_rows(text, text[], int[]) to authenticated;

commit;
