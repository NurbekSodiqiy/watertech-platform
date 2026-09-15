import { routing } from "@/i18n/routing";

/** Strips a leading non-default-locale prefix (e.g. "/ru") off a pathname
 * coming from next/navigation's raw usePathname(), which — unlike next-intl's
 * own usePathname() — always includes the prefix. Telemetry `path` values must
 * stay locale-less so dashboard aggregation isn't split by locale. */
export function stripLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}
