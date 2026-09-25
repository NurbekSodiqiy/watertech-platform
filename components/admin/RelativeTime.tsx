"use client";

import { useLocale, useTranslations } from "next-intl";
import { useNow } from "@/hooks/useNow";
import { formatDateTime, formatRelative } from "@/lib/admin/format";

/** Asia/Tashkent is UTC+5 all year (no DST), as lib/telemetry/aggregate.ts relies on. */
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** "2026-09-24 13:05" in Tashkent — built from the ISO string, not Intl, so the
 * server and the browser print the same characters (Node's ICU and Chrome's
 * locale data format "uz-UZ" differently, which broke hydration). */
function stableDateTime(iso: string): string {
  return new Date(Date.parse(iso) + TASHKENT_OFFSET_MS).toISOString().slice(0, 16).replace("T", " ");
}

/** "2 soat oldin" for an instant, rendered after mount (CLAUDE.md §15). The
 * server and the first client paint show a runtime-independent absolute time;
 * after mount the relative label takes over (refreshed every minute), with the
 * localized absolute date and time as its tooltip. */
export function RelativeTime({ iso }: { iso: string }) {
  const locale = useLocale();
  const t = useTranslations("admin.relativeTime");
  const now = useNow(60_000);

  if (!now) return <time dateTime={iso}>{stableDateTime(iso)}</time>;
  return (
    <time dateTime={iso} title={formatDateTime(iso, locale)}>
      {formatRelative(iso, t, locale)}
    </time>
  );
}
