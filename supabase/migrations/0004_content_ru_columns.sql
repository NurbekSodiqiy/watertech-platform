-- Optional Russian content: every field a manager may want translated gets a
-- nullable `<field>_ru` twin. Absent (null) means "no translation yet" — the
-- read path (lib/content/loader.ts) falls back to the Uzbek column, it never
-- fails or shows a blank. Numeric/enum/id columns (discount_pct, threat_level,
-- status, ids, sizes...) aren't language-dependent, so they're left alone.
-- content_competitors has no _ru columns — battle-cards stay Uzbek-only.

alter table public.content_scripts
  add column name_ru text,
  add column cheat_sheet_ru text,
  add column stages_ru jsonb;

alter table public.content_objections
  add column label_ru text,
  add column client_says_ru text,
  add column real_meaning_ru text,
  add column response_ru text,
  add column follow_up_ru text;

alter table public.content_faqs
  add column question_ru text,
  add column answer_ru text;

alter table public.content_package_groups
  add column title_ru text,
  add column subtitle_ru text;

alter table public.content_packages
  add column name_ru text,
  add column order_volume_ru text,
  add column payment_terms_ru text,
  add column estimated_discount_ru text,
  add column logistics_ru text,
  add column delivery_time_ru text;

-- content_products already has name_ru as the required primary name (product
-- names are Russian by default, see CLAUDE.md section 1) — name_uz is the
-- optional override in the other direction, for symmetry.
alter table public.content_products
  add column name_uz text;
