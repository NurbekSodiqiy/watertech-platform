"use client";

import { m, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { isNavItemActive, managerArea } from "@/lib/admin/nav";
import { noTransition, springs } from "@/lib/motion/tokens";

const TABS = managerArea("dashboard").items;

/** Client component so it can read the current pathname for active-tab
 * highlighting; layout.tsx has no searchParams to derive that from itself. */
export function DashboardTabs() {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => {
        const isActive = isNavItemActive(tab, pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex items-center gap-1.5 border-b-2 border-transparent px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
              isActive ? "text-primary-dark" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            {isActive && (
              <m.span
                layoutId="dashboard-tab-underline"
                className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary"
                transition={reduce ? noTransition : springs.snappy}
                aria-hidden
              />
            )}
            <Icon size={14} />
            {t(tab.label)}
          </Link>
        );
      })}
    </nav>
  );
}
