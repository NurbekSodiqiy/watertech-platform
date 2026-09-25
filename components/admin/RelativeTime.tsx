"use client";

import { useLocale, useTranslations } from "next-intl";
import { useNow } from "@/hooks/useNow";
import { formatDateTime, formatRelative, formatStableDateTime } from "@/lib/admin/format";

/** "2 soat oldin" for an instant, rendered after mount (CLAUDE.md §15). The
 * server and the first client paint show a runtime-independent absolute time;
 * after mount the relative label takes over (refreshed every minute), with the
 * localized absolute date and time as its tooltip. */
export function RelativeTime({ iso }: { iso: string }) {
  const locale = useLocale();
  const t = useTranslations("admin.relativeTime");
  const now = useNow(60_000);

  if (!now) return <time dateTime={iso}>{formatStableDateTime(iso)}</time>;
  return (
    <time dateTime={iso} title={formatDateTime(iso, locale)}>
      {formatRelative(iso, t, locale, now.getTime())}
    </time>
  );
}
