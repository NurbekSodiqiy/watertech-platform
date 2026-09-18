import { routing, type Locale } from "@/i18n/routing";

function isLocale(value: string): value is Locale {
  return routing.locales.some((locale) => locale === value);
}

/** Accepts an untrusted locale string (e.g. a query param that went through
 * the OAuth round trip) only if it is exactly one of routing.locales —
 * anything else, including a path or URL, falls back to the default. */
export function localeOrDefault(value: string | null | undefined): Locale {
  return value && isLocale(value) ? value : routing.defaultLocale;
}

/** Prefixes an app-internal pathname with the locale segment, matching
 * routing's localePrefix: "as-needed" (no prefix for the default locale). */
export function localizedPath(pathname: string, locale: Locale): string {
  return locale === routing.defaultLocale ? pathname : `/${locale}${pathname}`;
}
