-- 0002 created the content_* tables and their RLS policies, but RLS only
-- restricts which rows a role can see/touch — it doesn't grant baseline
-- table access. Without an explicit GRANT, every role (service_role
-- included, which bypasses RLS but not GRANT checks) gets "permission
-- denied for table" on all of them. `anon` is deliberately left out — no
-- policy targets it either, so it keeps no access at all.

grant select, insert, update, delete on
  public.content_scripts,
  public.content_objections,
  public.content_faqs,
  public.content_competitors,
  public.content_package_groups,
  public.content_packages,
  public.content_products,
  public.content_versions
to authenticated;

grant all on
  public.content_scripts,
  public.content_objections,
  public.content_faqs,
  public.content_competitors,
  public.content_package_groups,
  public.content_packages,
  public.content_products,
  public.content_versions
to service_role;

-- content_versions.id is bigserial — inserting into it (the snapshot
-- trigger, or a future admin read of version history) needs the sequence
-- privilege too, separate from the table privilege above.
grant usage, select on sequence public.content_versions_id_seq to authenticated, service_role;
