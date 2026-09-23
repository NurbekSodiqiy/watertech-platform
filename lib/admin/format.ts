/** Translator for the `admin.relativeTime` messages. */
export type RelativeTimeTranslator = (key: "now" | "minutes" | "hours" | "days", values?: { count: number }) => string;

/** Relative-time label for an admin table's "updated_at" column. Callers
 * must only use this after mount (see hooks/useMounted.ts) — it reads
 * Date.now(), which would otherwise produce a server/client hydration
 * mismatch. Beyond 30 days it falls back to a plain date in `locale`. */
export function formatRelative(iso: string, t: RelativeTimeTranslator, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return t("now");
  if (diffMin < 60) return t("minutes", { count: diffMin });
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return t("hours", { count: diffHour });
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return t("days", { count: diffDay });
  return new Date(iso).toLocaleDateString(locale === "ru" ? "ru-RU" : "uz-UZ");
}

/** Absolute date and time in the office's time zone (Tashkent, like every
 * other date the manager area shows). Deterministic for a given instant, so —
 * unlike formatRelative — it is safe to call while rendering on the server. */
export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "uz-UZ", {
    timeZone: "Asia/Tashkent",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
