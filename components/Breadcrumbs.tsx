"use client";

import { ChevronRight, Home } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { getBreadcrumbs } from "@/lib/site-config";

// Client Component (not Server) even though it has no interactivity of its
// own — it's rendered from both Server Component pages and Client Component
// templates (e.g. ScriptTemplate), and a Client Component can render either,
// while a Server Component using next-intl/server's getTranslations cannot
// be imported into a Client Component's module graph.
export function Breadcrumbs({ path }: { path: string }) {
  const crumbs = getBreadcrumbs(path);
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");

  return (
    <nav
      aria-label={tCommon("breadcrumbs")}
      className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-text-secondary"
    >
      {/* Icon-only, so the name has to come from aria-label — without it axe
          reports a serious `link-name` violation and a screen reader announces
          the crumb trail as starting with an unnamed link. */}
      <Link href="/" aria-label={t("home")} className="flex shrink-0 items-center gap-1 hover:text-primary-dark">
        <Home size={13} aria-hidden="true" />
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.path} className="flex min-w-0 items-center gap-1.5">
          <ChevronRight size={13} className="shrink-0 opacity-50" />
          {i === crumbs.length - 1 ? (
            <span className="truncate font-medium text-primary-dark">{t(c.title)}</span>
          ) : (
            <Link href={c.path} className="shrink-0 hover:text-primary-dark">
              {t(c.title)}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
