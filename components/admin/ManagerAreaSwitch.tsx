"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { MANAGER_NAV, activeAreaId } from "@/lib/admin/nav";

/** The Dashboard ↔ Admin switch in the header of both manager shells
 * (AdminShell, ManagerMonitoringHeader). Reads MANAGER_NAV, so the two headers
 * cannot list different areas, and highlights the area the current path is in.
 * Below `sm` only the icons show — the label stays as the link's accessible
 * name and tooltip. */
export function ManagerAreaSwitch() {
  const t = useTranslations("chrome.managerNav");
  const pathname = usePathname();
  const current = activeAreaId(pathname);

  return (
    <nav
      aria-label={t("label")}
      className="flex items-center gap-0.5 rounded-xl border border-border bg-surface-alt p-0.5"
    >
      {MANAGER_NAV.map((area) => {
        const Icon = area.icon;
        const isActive = area.id === current;
        const label = t(`areas.${area.id}`);
        return (
          <Link
            key={area.id}
            href={area.href}
            aria-current={isActive ? "page" : undefined}
            aria-label={label}
            title={label}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
              isActive ? "bg-surface text-primary-dark shadow-sm" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
