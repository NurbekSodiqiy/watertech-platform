"use client";

import { Link, usePathname } from "@/i18n/routing";
import { Activity, FileStack, Star, type LucideIcon } from "lucide-react";

interface DashboardTab {
  path: string;
  label: string;
  icon: LucideIcon;
}

const TABS: DashboardTab[] = [
  { path: "/dashboard", label: "Faollik", icon: Activity },
  { path: "/dashboard/content", label: "Kontent", icon: FileStack },
  { path: "/dashboard/quality", label: "Sifat", icon: Star },
];

/** Client component (not translated via next-intl, same as AdminShell's own
 * nav — the manager area's chrome is hardcoded Uzbek throughout) so it can
 * read the current pathname for active-tab highlighting; layout.tsx has no
 * searchParams to derive that from itself. */
export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => {
        const isActive = tab.path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(tab.path);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
              isActive
                ? "border-primary text-primary-dark"
                : "border-transparent text-text-secondary hover:text-primary-dark"
            }`}
          >
            <Icon size={14} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
